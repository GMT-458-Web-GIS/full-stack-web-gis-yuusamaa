// backend/src/routes/changeRequests.js
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

/**
 * GET /api/change-requests?status=open
 * Admin panel bununla listeler.
 */
router.get("/", async (req, res) => {
  try {
    const status = (req.query.status || "open").toString();

    const { rows } = await pool.query(
      `
      SELECT
        cr.*,
        lr.title AS report_title,
        lr.status AS report_status
      FROM public.change_requests cr
      JOIN public.litter_reports lr ON lr.id = cr.report_id
      WHERE cr.status = $1
      ORDER BY cr.created_at DESC
      `,
      [status]
    );

    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/change-requests
 * Editor panel "değişiklik için bildir" buraya atar.
 * body: { reportId, reason }
 */
router.post("/", async (req, res) => {
  try {
    const { reportId, reason } = req.body || {};
    if (!reportId || !reason || !String(reason).trim()) {
      return res.status(400).json({ ok: false, error: "reportId ve reason gerekli." });
    }

    const requestedBy = req.user?.id ?? null; // sisteminde req.user yoksa null kalır

    const { rows } = await pool.query(
      `
      INSERT INTO public.change_requests (report_id, reason, status, requested_by)
      VALUES ($1, $2, 'open', $3)
      RETURNING *
      `,
      [reportId, String(reason).trim(), requestedBy]
    );

    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * PATCH /api/change-requests/:id/resolve
 * Admin panel buradan kararı uygular.
 * body: { action: "revert" | "dismiss" }
 *
 * revert -> ilgili litter_report tekrar pending olur (editor paneline geri düşer)
 */
router.patch("/:id/resolve", async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const action = (req.body?.action || "").toString();

    if (!id || !["revert", "dismiss"].includes(action)) {
      return res.status(400).json({ ok: false, error: "Geçersiz istek." });
    }

    await client.query("BEGIN");

    const crRes = await client.query(
      `SELECT * FROM public.change_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const cr = crRes.rows[0];
    if (!cr) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Talep bulunamadı." });
    }
    if (cr.status !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Talep zaten kapalı." });
    }

    if (action === "revert") {
      // raporu tekrar pending'e al
      await client.query(
        `
        UPDATE public.litter_reports
        SET
          status = 'pending',
          approved_by = NULL,
          rejected_by = NULL,
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = $1
        `,
        [cr.report_id]
      );
    }

    const resolvedBy = req.user?.id ?? null;

    const updRes = await client.query(
      `
      UPDATE public.change_requests
      SET
        status = 'resolved',
        resolved_action = $2,
        resolved_by = $3,
        resolved_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, action, resolvedBy]
    );

    await client.query("COMMIT");
    res.json({ ok: true, data: updRes.rows[0] });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
