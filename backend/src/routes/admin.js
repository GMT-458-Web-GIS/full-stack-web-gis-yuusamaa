// backend/src/routes/admin.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// ✅ requireAuth artık object export ediyor; ama biz requireAuth("admin") uyumluluğunu middleware'e ekledik
const { requireAuth } = require("../middlewares/requireAuth");

const {
  getEditorCredentials,
  setEditorCredentials,
} = require("../credentialsStore");

// 🔒 ADMIN guard
router.use(requireAuth("admin"));

/**
 * ✅ GET /api/admin/editor-credentials
 */
router.get("/editor-credentials", (req, res) => {
  const creds = getEditorCredentials();
  return res.json({ ok: true, data: creds || { email: "", password: "" } });
});

/**
 * ✅ POST /api/admin/editor-credentials
 * body: { email, password }
 */
router.post("/editor-credentials", (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email ve password zorunlu" });
    }

    setEditorCredentials({ email, password });
    return res.json({ ok: true, data: { email } });
  } catch (err) {
    console.error("EDITOR CREDENTIALS SAVE ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * ✅ GET /api/admin/change-requests?status=open
 * report_change_requests tablosundan listeler.
 */
router.get("/change-requests", async (req, res) => {
  const status = String(req.query.status || "").trim(); // open / closed vs
  try {
    const params = [];
    const where = [];

    if (status) {
      where.push(`rcr.status = $${params.length + 1}`);
      params.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const q = `
      SELECT
        rcr.id,
        rcr.report_id,
        rcr.status,
        rcr.requested_by,
        rcr.resolved_by,
        rcr.resolved_at,
        lr.title AS report_title,
        lr.status AS report_status
      FROM public.report_change_requests rcr
      LEFT JOIN public.litter_reports lr ON lr.id = rcr.report_id
      ${whereSql}
      ORDER BY rcr.id DESC
      LIMIT 200
    `;

    const r = await pool.query(q, params);
    return res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error("CHANGE REQUESTS LIST ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ POST /api/admin/change-requests/:id/revert
 * - change_request tekrar open olur
 * - resolved_by / resolved_at NULL
 * - ilgili litter_report tekrar pending olur
 */
router.post("/change-requests/:id/revert", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const check = await pool.query(
      `SELECT id, report_id FROM public.report_change_requests WHERE id = $1`,
      [id]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Talep bulunamadı" });
    }

    const reportId = check.rows[0].report_id;

    await pool.query(
      `
      UPDATE public.report_change_requests
      SET
        status = 'open',
        resolved_by = NULL,
        resolved_at = NULL
      WHERE id = $1
      `,
      [id]
    );

    await pool.query(
      `
      UPDATE public.litter_reports
      SET status = 'pending', updated_at = NOW()
      WHERE id = $1
      `,
      [reportId]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("REVERT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ POST /api/admin/change-requests/:id/close
 * - talebi kapatır (closed)
 * - resolved_by = admin user id (FK’ye uyar)
 * - resolved_at = now
 */
router.post("/change-requests/:id/close", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const check = await pool.query(
      `SELECT id FROM public.report_change_requests WHERE id = $1`,
      [id]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Talep bulunamadı" });
    }

    await pool.query(
      `
      UPDATE public.report_change_requests
      SET
        status = 'closed',
        resolved_by = $2,
        resolved_at = NOW()
      WHERE id = $1
      `,
      [id, req.user.id]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("CLOSE CHANGE REQUEST ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
