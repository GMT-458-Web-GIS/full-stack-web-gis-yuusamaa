const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const TABLE = "public.recycling_points";

// Küçük yardımcı: array unique + sort TR
function uniqSortedTR(arr) {
  return Array.from(
    new Set((arr || []).map((x) => (x ?? "").toString().trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "tr"));
}

/**
 * GET /api/recycling-points
 * Query:
 *  - ilce: string (recycling_points.ilce ile filtreler)
 *  - atikTuru: string (recycling_points.atik_turu_adi ile filtreler)
 *  - category: string (recycling_points.category ile filtreler)
 */
router.get("/", async (req, res) => {
  try {
    const { ilce, atikTuru, category } = req.query;

    const where = [];
    const params = [];

    const add = (val) => {
      params.push(val);
      return `$${params.length}`;
    };

    if (ilce && ilce.toString().trim()) {
      where.push(`ilce = ${add(ilce.toString().trim())}`);
    }

    if (atikTuru && atikTuru.toString().trim()) {
      where.push(`atik_turu_adi = ${add(atikTuru.toString().trim())}`);
    }

    if (category && category.toString().trim()) {
      where.push(`category = ${add(category.toString().trim())}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        id,
        external_id,
        source,
        ilce,
        atik_turu_id,
        atik_turu_adi,
        waste_type_id,
        name,
        category,
        address,
        phone,
        created_at,
        ST_Y(geom::geometry) AS lat,
        ST_X(geom::geometry) AS lng
      FROM ${TABLE}
      ${whereSql}
      ORDER BY id DESC
      LIMIT 5000;
    `;

    const { rows } = await pool.query(sql, params);
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET /recycling-points error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

/**
 * GET /api/recycling-points/filters
 * - İlçeler: public.districts_geom.feature_name (veri olmasa bile hepsi gelsin)
 * - Atık Türleri: public.waste_types.name (veri olmasa bile hepsi gelsin)
 * - Kategoriler: public.waste_types.code (opsiyonel)
 */
router.get("/filters", async (req, res) => {
  try {
    // ✅ districts_geom tablosunda "name" yok -> ilçe adı sende feature_name
    const districtsQ = `
      SELECT feature_name AS name
      FROM public.districts_geom
      WHERE feature_name IS NOT NULL AND btrim(feature_name) <> ''
      ORDER BY feature_name ASC;
    `;

    const wasteTypesQ = `
      SELECT
        COALESCE(name, '') AS name,
        COALESCE(code, '') AS code
      FROM public.waste_types
      ORDER BY name ASC;
    `;

    const [districtsR, wasteR] = await Promise.all([
      pool.query(districtsQ),
      pool.query(wasteTypesQ),
    ]);

    const ilceler = uniqSortedTR(districtsR.rows.map((r) => r.name));
    const atikTurleri = uniqSortedTR(wasteR.rows.map((r) => r.name));
    const kategoriler = uniqSortedTR(wasteR.rows.map((r) => r.code));

    return res.json({
      ok: true,
      data: { ilceler, atikTurleri, kategoriler },
    });
  } catch (err) {
    console.error("GET /recycling-points/filters error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

module.exports = router;
