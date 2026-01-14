/**
 * ABB Sıfır Atık - Atık Toplama Noktaları Fetch Script (CSRF FIX)
 * - İlçeler ve atık türlerini JSON'dan okur
 * - Önce sayfayı GET ederek cookie + XSRF token alır
 * - /atiktoplamanoktalari/sorgula endpoint'ine POST atar (Cookie + X-XSRF-TOKEN ile)
 * - data/raw klasörüne ham JSON yazar
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const BASE = "https://sifiratik.ankara.bel.tr";
const PAGE_URL = `${BASE}/atiktoplamanoktalari`;
const ENDPOINT = `${BASE}/atiktoplamanoktalari/sorgula`;

const DATA_DIR = path.join(process.cwd(), "data");
const RAW_DIR = path.join(DATA_DIR, "raw");

const ILCE_FILE = path.join(DATA_DIR, "abb_ilceler.json");
const TUR_FILE = path.join(DATA_DIR, "abb_atik_turleri.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Windows dosya adı güvenli hale getirme
function safeName(s) {
  return String(s)
    .trim()
    .replaceAll("İ", "I")
    .replaceAll("ı", "i")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** node-fetch set-cookie -> tek cookie header string */
function buildCookieHeader(setCookieArr) {
  if (!setCookieArr || setCookieArr.length === 0) return "";
  // "name=value; Path=/; ..." -> "name=value"
  const pairs = setCookieArr.map((c) => c.split(";")[0].trim());
  // aynı cookie tekrar geldiyse sonuncusu kalsın diye Map ile de yapılabilir; şimdilik join yeterli
  return pairs.join("; ");
}

/** Cookie header içinden XSRF-TOKEN değerini çek (url-encoded olabilir) */
function extractXsrfTokenFromCookieHeader(cookieHeader) {
  // ör: "XSRF-TOKEN=eyJpdiI...%3D; laravel_session=..."
  const m = cookieHeader.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]); // Laravel genelde url-encoded verir
  } catch {
    return m[1];
  }
}

/** CSRF için yeni oturum (cookie + xsrf) al */
async function getSession() {
  const res = await fetch(PAGE_URL, {
    method: "GET",
    headers: {
      "User-Agent": "ANKA-TEMIZ Student Project",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.7,en;q=0.6",
      "Connection": "keep-alive",
    },
    redirect: "follow",
  });

  const setCookie = res.headers.raw?.()["set-cookie"] ?? [];
  const cookieHeader = buildCookieHeader(setCookie);
  const xsrf = extractXsrfTokenFromCookieHeader(cookieHeader);

  if (!cookieHeader || !xsrf) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `Session alınamadı. cookieHeader veya XSRF-TOKEN yok. Status=${res.status}. HTML head: ${t.slice(0, 200)}`
    );
  }

  return { cookieHeader, xsrf };
}

async function postSorgula({ ilce, atikturu, session }) {
  const form = new URLSearchParams();
  form.set("ilce", ilce);
  form.set("atikturu", String(atikturu));

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      // Laravel/CSRF için kritik:
      "Cookie": session.cookieHeader,
      "X-XSRF-TOKEN": session.xsrf,
      // bazı sistemlerde bu ikisi de iş görüyor:
      "Origin": BASE,
      "Referer": PAGE_URL,
      "User-Agent": "ANKA-TEMIZ Student Project",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.7,en;q=0.6",
    },
    body: form.toString(),
  });

  // 419 olursa body genelde json/text dönebiliyor, yakalayalım
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} - ${text.slice(0, 200)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return res.json();
}

async function main() {
  ensureDir(RAW_DIR);

  const ilceler = readJson(ILCE_FILE); // ["Çankaya", ...]
  const turler = readJson(TUR_FILE);   // [{id:25,...}, ...]

  // İlk session
  let session = await getSession();
  let totalRequests = 0;
  let totalItems = 0;

  const coordCount = new Map(); // "lat,lon" -> adet

  // İstersen her N istekte bir session yenileyebilirsin (bazı siteler tokenı sık döndürür)
  const REFRESH_EVERY = 40;
  let sinceRefresh = 0;

  for (const ilce of ilceler) {
    for (const tur of turler) {
      totalRequests++;
      sinceRefresh++;

      if (sinceRefresh >= REFRESH_EVERY) {
        session = await getSession();
        sinceRefresh = 0;
        console.log("🔄 Session yenilendi (periyodik).");
      }

      const turId = tur.id ?? tur.tur_id ?? tur.value ?? tur;
      const turName = tur.baslik ?? tur.ad ?? "";

      console.log(`POST -> ilce="${ilce}" atikturu=${turId} (${turName})`);

      let data;
      try {
        data = await postSorgula({ ilce, atikturu: turId, session });
      } catch (e) {
        // 419 ise session yenile ve 1 kez tekrar dene
        if (e.status === 419 || String(e.message).includes("HTTP 419")) {
          console.warn("  ⚠️  419 CSRF geldi. Session yenilenip tekrar deneniyor...");
          session = await getSession();
          sinceRefresh = 0;

          try {
            data = await postSorgula({ ilce, atikturu: turId, session });
          } catch (e2) {
            console.error("  ❌ Tekrar denemede de hata:", e2.message);
            continue;
          }
        } else {
          console.error("  ❌ Hata:", e.message);
          continue;
        }
      }

      // Response format: array bekliyoruz (sende array geliyordu)
      const items = Array.isArray(data) ? data : (data.items ?? []);
      totalItems += items.length;

      // koordinat özet
      for (const it of items) {
        if (!it || !Array.isArray(it.konum) || it.konum.length < 2) continue;
        const lon = Number(it.konum[0]);
        const lat = Number(it.konum[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
        coordCount.set(key, (coordCount.get(key) ?? 0) + 1);
      }

      const out = {
        meta: {
          ilce,
          atikturu_id: turId,
          fetched_at: new Date().toISOString(),
          count: items.length,
        },
        items,
      };

      const outPath = path.join(RAW_DIR, `abb_${safeName(ilce)}_${turId}.json`);
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

      console.log(`  ✅ Kaydedildi: data\\raw\\abb_${safeName(ilce)}_${turId}.json  count: ${items.length}`);

      // siteyi yormamak için küçük bekleme
      await sleep(200);
    }
  }

  // En çok tekrar eden koordinat
  let maxKey = null;
  let maxVal = 0;
  for (const [k, v] of coordCount.entries()) {
    if (v > maxVal) { maxVal = v; maxKey = k; }
  }

  console.log("\n==================== ÖZET ====================");
  console.log("Toplam istek:", totalRequests);
  console.log("Toplam item:", totalItems);
  console.log("Koordinatı olan unique key:", coordCount.size);
  console.log("En çok tekrar eden koordinat:", maxKey, "adet:", maxVal);
  console.log("=============================================\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
