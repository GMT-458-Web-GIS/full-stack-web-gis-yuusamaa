/**
 * ABB Sıfır Atık - RAW JSON -> PostGIS import (IDEMPOTENT)
 *
 * - backend/data/raw/abb_*.json dosyalarını okur
 * - items içindeki konum: ["lon","lat"] olanları DB'ye yazar
 * - category alanını "abb_atik_turleri.json" dosyasındaki English category ile yazar
 * - Aynı kayıt tekrar import edilirse DB'ye tekrar eklemez (WHERE NOT EXISTS ile)
 *
 * Beklenen raw format:
 * {
 *   "meta": { "ilce": "...", "atikturu_id": 25, ... },
 *   "items": [ { "konum": ["32.8","39.9"], "adres":"...", "ilce":"...", "tur_id":25, "tur":{...} }, ... ]
 * }
 */

import fs from "fs";
import path from "path";
import { pool } from "../src/db.js";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const SOURCE = "ABB Sifir Atik";
const TUR_FILE = path.join(process.cwd(), "data", "abb_atik_turleri.json");

// ---------------- helpers ----------------

function listRawFiles() {
  if (!fs.existsSync(RAW_DIR)) return [];
  return fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.startsWith("abb_") && f.endsWith(".json"))
    .map((f) => path.join(RAW_DIR, f));
}

function tryParseNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// ABB "adres" alanında HTML var; basitçe tagleri uçuralım
function stripHtml(s) {
  return String(s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function safeText(x) {
  if (x === null || x === undefined) return "";
  return String(x).trim();
}

function loadWasteTypeMap() {
  // beklenen: [{id, name, category}, ...]
  const arr = JSON.parse(fs.readFileSync(TUR_FILE, "utf8"));
  const m = new Map();
  for (const t of arr) {
    if (t && (t.id !== undefined) && t.category) {
      m.set(Number(t.id), String(t.category));
    }
  }
  return m;
}

// ---------------- main ----------------

async function main() {
  console.log("IMPORT SCRIPT STARTED ✅");
  console.log("CWD:", process.cwd());
  console.log("RAW DIR:", RAW_DIR);

  const files = listRawFiles();
  console.log("Bulunan raw dosya:", files.length);

  if (!files.length) {
    console.log("Hiç abb_*.json yok. Önce fetch scriptini çalıştır.");
    await pool.end();
    return;
  }

  // atık türü id -> english category map
  const typeMap = loadWasteTypeMap();

  let inserted = 0;
  let skippedNoCoord = 0;
  let skippedDupInRun = 0;
  let skippedAlreadyInDb = 0;

  // Aynı çalıştırma içinde tekrar insert engeli
  const seen = new Set();

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      console.error("JSON okunamadı:", file, e.message);
      continue;
    }

    const meta = raw?.meta ?? {};
    const items = Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw) ? raw : []);

    // Dosyanın tur id'si (yoksa item içinden buluruz)
    const fileTurId = meta.atikturu_id !== undefined ? Number(meta.atikturu_id) : null;

    for (const it of items) {
      if (!it) continue;

      // konum: ["lon","lat"]
      if (!Array.isArray(it.konum) || it.konum.length < 2) {
        skippedNoCoord++;
        continue;
      }

      const lon = tryParseNumber(it.konum[0]);
      const lat = tryParseNumber(it.konum[1]);
      if (lon === null || lat === null) {
        skippedNoCoord++;
        continue;
      }

      const address = stripHtml(it.adres);
      if (!address) continue;

      const ilce = safeText(it.ilce || meta.ilce);
      const itemTurId =
        it.tur_id !== undefined ? Number(it.tur_id) :
        (it.tur?.id !== undefined ? Number(it.tur.id) :
        fileTurId);

      // DB category: english slug
      const category = typeMap.get(itemTurId) || (itemTurId ? `abb_${itemTurId}` : "abb_unknown");

      // name: adresin ilk satırı (genelde "ECZANE: ..." gibi)
      const firstLine = address.split("\n")[0]?.trim();
      const name = firstLine || (it.tur?.baslik ? safeText(it.tur.baslik) : "") || `ABB_${itemTurId ?? "unknown"}`;

      // aynı çalıştırmada duplicate engeli (çok hızlı)
      const key = `${SOURCE}|||${category}|||${name}|||${address}|||${lat.toFixed(6)}|||${lon.toFixed(6)}`;
      if (seen.has(key)) {
        skippedDupInRun++;
        continue;
      }
      seen.add(key);

      // DB tarafında "idempotent" insert:
      // Aynı source+category+name+address+same point varsa tekrar ekleme
      try {
        const r = await pool.query(
          `
          INSERT INTO recycling_points (name, category, address, phone, source, geom, created_at)
          SELECT $1, $2, $3, $4, $5,
                 ST_SetSRID(ST_MakePoint($6, $7), 4326),
                 NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM recycling_points rp
            WHERE rp.source = $5
              AND rp.category = $2
              AND rp.name = $1
              AND rp.address = $3
              AND ST_Equals(rp.geom, ST_SetSRID(ST_MakePoint($6, $7), 4326))
          )
          `,
          [name, category, address, null, SOURCE, lon, lat]
        );

        // INSERT ... SELECT ... WHERE NOT EXISTS => rowCount 1 ise insert oldu
        if (r.rowCount === 1) inserted++;
        else skippedAlreadyInDb++;
      } catch (e) {
        console.error("INSERT ERROR:", e.message);
      }
    }
  }

  console.log("\n=========== IMPORT ÖZET ===========");
  console.log("Inserted:", inserted);
  console.log("Skipped (no coord):", skippedNoCoord);
  console.log("Skipped (dup in same run):", skippedDupInRun);
  console.log("Skipped (already in DB):", skippedAlreadyInDb);
  console.log("===================================\n");

  await pool.end();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
