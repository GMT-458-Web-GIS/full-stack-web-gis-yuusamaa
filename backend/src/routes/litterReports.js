// backend/src/routes/litterReports.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { pool } = require("../db");
const { authRequired, requireRole } = require("../middlewares/requireAuth");

const router = express.Router();
const TABLE = "public.litter_reports";

/**
 * Uploads klasörü (backend/uploads)
 */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Multer (multipart/form-data için)
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext && ext.length <= 10 ? ext : "";
    cb(null, `litter_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});
const upload = multer({ storage });

/**
 * Helpers
 */
function toNullableNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * ✅ LIST
 * GET /api/litter-reports?status=pending|approved|rejected
 * - citizen: sadece kendi kayıtları
 * - editor/admin: tüm kayıtlar (status filtrelenebilir)
 */
router.get("/", authRequired, async (req, res) => {
  const status = (req.query.status || "").toString().trim();
  const role = req.user?.role;
  const userId = req.user?.id;

  try {
    const params = [];
    const where = [];

    // role'a göre kısıt
    if (role === "citizen") {
      where.push(`created_by = $${params.length + 1}`);
      params.push(userId);
    }

    if (status) {
      where.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const q = `
      SELECT
        id, title, description, status,
        address_text,
        photo_url,
        created_by, approved_by, rejected_by, rejection_reason,
        atik_turu_id,
        ST_Y(geom)::double precision AS lat,
        ST_X(geom)::double precision AS lon,
        created_at, updated_at
      FROM ${TABLE}
      ${whereSql}
      ORDER BY id DESC
      LIMIT 500
    `;

    const r = await pool.query(q, params);
    return res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error("LITTER REPORTS LIST ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ DETAIL
 * GET /api/litter-reports/:id
 * - citizen: sadece kendi raporunu görebilir
 * - editor/admin: görebilir
 */
router.get("/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const role = req.user?.role;
  const userId = req.user?.id;

  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const r = await pool.query(
      `
      SELECT
        id, title, description, status,
        address_text,
        photo_url,
        created_by, approved_by, rejected_by, rejection_reason,
        atik_turu_id,
        ST_Y(geom)::double precision AS lat,
        ST_X(geom)::double precision AS lon,
        created_at, updated_at
      FROM ${TABLE}
      WHERE id = $1
      `,
      [id]
    );

    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: "Not Found" });

    const row = r.rows[0];

    if (role === "citizen" && row.created_by !== userId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    return res.json({ ok: true, data: row });
  } catch (err) {
    console.error("LITTER REPORT DETAIL ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ CREATE (citizen)
 * POST /api/litter-reports
 *
 * 1) JSON ile:
 * {
 *   title, description, address_text,
 *   lat, lon,
 *   atik_turu_id,
 *   photo_base64, photo_name
 * }
 *
 * 2) multipart/form-data ile:
 *  - fields: title, description, address_text, lat, lon, atik_turu_id
 *  - file: photo
 */
router.post("/", authRequired, requireRole(["citizen"]), upload.single("photo"), async (req, res) => {
  try {
    const title = (req.body?.title || "").toString().trim();
    const description = (req.body?.description ?? null);
    const addressText = (req.body?.address_text ?? null);

    const lat = toNullableNumber(req.body?.lat);
    const lon = toNullableNumber(req.body?.lon);

    const atikTuruId = toNullableNumber(req.body?.atik_turu_id);

    if (!title) return res.status(400).json({ ok: false, error: "title is required" });
    if (lat === null || lon === null) {
      return res.status(400).json({ ok: false, error: "lat/lon is required" });
    }

    // photo: multer ile geldiyse
    let photoUrl = null;
    if (req.file?.filename) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else {
      // JSON base64 geldiyse (opsiyonel)
      const photoBase64 = req.body?.photo_base64;
      if (photoBase64 && typeof photoBase64 === "string") {
        const photoName = (req.body?.photo_name || "photo.jpg").toString();
        const ext = path.extname(photoName) || ".jpg";
        const fname = `litter_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
        const outPath = path.join(UPLOAD_DIR, fname);

        const cleaned = photoBase64.replace(/^data:.+;base64,/, "");
        fs.writeFileSync(outPath, Buffer.from(cleaned, "base64"));
        photoUrl = `/uploads/${fname}`;
      }
    }

    // PostGIS geom: ST_MakePoint(lon, lat)  (X=lon, Y=lat)
    const q = `
      INSERT INTO ${TABLE}
        (title, description, address_text, photo_url, created_by, status, geom, atik_turu_id)
      VALUES
        ($1, $2, $3, $4, $5, 'pending', ST_SetSRID(ST_MakePoint($6::double precision, $7::double precision), 4326), $8)
      RETURNING
        id, title, description, status, address_text, photo_url, created_by,
        approved_by, rejected_by, rejection_reason, atik_turu_id,
        ST_Y(geom)::double precision AS lat,
        ST_X(geom)::double precision AS lon,
        created_at, updated_at
    `;

    const params = [
      title,
      description,
      addressText,
      photoUrl,
      req.user.id,
      lon,
      lat,
      atikTuruId,
    ];

    const r = await pool.query(q, params);
    return res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error("LITTER REPORT CREATE ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ APPROVE (editor/admin)
 * PATCH /api/litter-reports/:id/approve
 */
router.patch("/:id/approve", authRequired, requireRole(["editor", "admin"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const r = await pool.query(
      `
      UPDATE ${TABLE}
      SET
        status = 'approved',
        approved_by = $2,
        rejected_by = NULL,
        rejection_reason = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, approved_by, rejected_by, rejection_reason
      `,
      [id, req.user.id]
    );

    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: "Not Found" });
    return res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ REJECT (editor/admin)
 * PATCH /api/litter-reports/:id/reject
 * body: { reason?: string }
 */
router.patch("/:id/reject", authRequired, requireRole(["editor", "admin"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  const reason = (req.body?.reason ?? req.body?.rejection_reason ?? null);
  const reasonText = reason === null ? null : String(reason);

  try {
    const r = await pool.query(
      `
      UPDATE ${TABLE}
      SET
        status = 'rejected',
        rejected_by = $2,
        approved_by = NULL,
        rejection_reason = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, approved_by, rejected_by, rejection_reason
      `,
      [id, req.user.id, reasonText]
    );

    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: "Not Found" });
    return res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error("REJECT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ CHANGE REQUEST CREATE (editor)
 * POST /api/litter-reports/:id/change-request
 *
 * Body (opsiyonel): { reason?: string }
 * Şimdilik DB tablonuzda reason kolonu görünmediği için kullanmıyoruz.
 */
router.post("/:id/change-request", authRequired, requireRole(["editor"]), async (req, res) => {
  const reportId = Number(req.params.id);
  if (!reportId) return res.status(400).json({ ok: false, error: "Invalid report id" });

  try {
    // aynı report için açık talep var mı? (opsiyonel kontrol)
    const exists = await pool.query(
      `
      SELECT id
      FROM public.report_change_requests
      WHERE report_id = $1 AND status = 'open'
      LIMIT 1
      `,
      [reportId]
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({ ok: false, error: "Bu rapor için zaten açık talep var." });
    }

    const r = await pool.query(
      `
      INSERT INTO public.report_change_requests (report_id, status, requested_by)
      VALUES ($1, 'open', $2)
      RETURNING id, report_id, status, requested_by, resolved_by, resolved_at
      `,
      [reportId, req.user.id]
    );

    return res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error("CREATE CHANGE REQUEST ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
