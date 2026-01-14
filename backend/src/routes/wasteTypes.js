// backend/src/routes/wasteTypes.js
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

/**
 * GET /api/waste-types
 * Citizen & Editor dropdown için atık türleri listesi
 */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, code, name, category
      FROM public.waste_types
      ORDER BY id ASC
    `);

    return res.json({ ok: true, data: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
