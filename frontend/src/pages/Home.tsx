// frontend/src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getRecyclingPoints,
  getRecyclingFilters,
  type RecyclingFilters,
  type RecyclingPoint,
} from "../api/recyclingPoints";

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  }, [map]);
  return null;
}

function stringToHslColor(str: string, s = 70, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function makeColorDotIcon(label: string) {
  const color = stringToHslColor(label || "default");
  const html = `
    <div style="
      width: 16px; height: 16px;
      background:${color};
      border:2px solid white; 
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,.35);
    "></div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function Home() {
  const [allPoints, setAllPoints] = useState<RecyclingPoint[]>([]);
  const [points, setPoints] = useState<RecyclingPoint[]>([]);

  const [filters, setFilters] = useState<RecyclingFilters>({
    ilceler: [],
    atikTurleri: [],
    kategoriler: [],
  });

  const [selectedIlce, setSelectedIlce] = useState<string>("Tümü");
  const [selectedAtikTuru, setSelectedAtikTuru] = useState<string>("Tümü");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // ✅ Sayfa açılışında:
  // - pin dataları: /recycling-points
  // - dropdown dataları: /recycling-points/filters (tüm türler + tüm ilçeler)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      const [pointsRes, filtersRes] = await Promise.all([
        getRecyclingPoints(),
        getRecyclingFilters(),
      ]);

      if (!pointsRes.ok) {
        setAllPoints([]);
        setPoints([]);
        setErr(pointsRes.error || "Recycling points alınamadı.");
        setLoading(false);
        return;
      }

      setAllPoints(pointsRes.data ?? []);
      setPoints(pointsRes.data ?? []);

      if (filtersRes.ok && filtersRes.data) {
        // ✅ burada tüm atık türleri görünecek (19 kayıt)
        setFilters(filtersRes.data);
      } else {
        // filters endpoint sorunluysa bile sayfa çalışsın
        console.warn("filters fetch failed:", filtersRes.ok ? "" : filtersRes.error);
      }

      setLoading(false);
    })();
  }, []);

  // ✅ Seçimler değişince front-end filtrelemesi
  useEffect(() => {
    const next = allPoints.filter((p) => {
      const ilceOk =
        selectedIlce === "Tümü" ? true : (p.ilce ?? "") === selectedIlce;

      const atikOk =
        selectedAtikTuru === "Tümü"
          ? true
          : (p.atik_turu_adi ?? "") === selectedAtikTuru;

      return ilceOk && atikOk;
    });

    setPoints(next);
  }, [allPoints, selectedIlce, selectedAtikTuru]);

  const center = useMemo<[number, number]>(() => [39.925, 32.84], []);

  const visiblePoints = useMemo(
    () => points.filter((p) => p.lat != null && p.lng != null),
    [points]
  );

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>
      {/* Sol panel */}
      <div style={{ width: 320, padding: 16, borderRight: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Atık Toplama Noktaları</h2>
            <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
              İlçe ve atık türüne göre filtreleyin.
            </div>
          </div>

          <Link
            to="/auth"
            style={{
              alignSelf: "flex-start",
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 12,
              color: "#111",
              background: "#fff",
            }}
          >
            Giriş / Kayıt
          </Link>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: "#444" }}>İlçe</label>
          <select
            value={selectedIlce}
            onChange={(e) => setSelectedIlce(e.target.value)}
            style={{ width: "100%", marginTop: 6, padding: 8 }}
          >
            <option value="Tümü">Tümü</option>
            {filters.ilceler.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: "#444" }}>Atık Türü</label>
          <select
            value={selectedAtikTuru}
            onChange={(e) => setSelectedAtikTuru(e.target.value)}
            style={{ width: "100%", marginTop: 6, padding: 8 }}
          >
            <option value="Tümü">Tümü</option>
            {filters.atikTurleri.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            Not: Seçilen türde nokta yoksa haritada pin görünmeyebilir, ama seçim yapılabilir.
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
          {loading ? "Yükleniyor..." : null}
          {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
          {!loading && !err ? (
            <div>
              Gösterilen nokta sayısı: <b>{visiblePoints.length}</b>
            </div>
          ) : null}
        </div>
      </div>

      {/* Harita */}
      <div style={{ flex: 1, height: "100%" }}>
        <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
          <InvalidateSizeOnMount />
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visiblePoints.map((p) => {
            const icon = makeColorDotIcon(p.atik_turu_adi || "Atık");
            return (
              <Marker
                key={p.id}
                position={[p.lat as number, p.lng as number]}
                icon={icon}
              >
                <Popup>
                  <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                    <div>
                      <b>{p.name || "Nokta"}</b>
                    </div>
                    {p.ilce ? (
                      <div style={{ marginTop: 4 }}>
                        <b>İlçe:</b> {p.ilce}
                      </div>
                    ) : null}
                    {p.atik_turu_adi ? (
                      <div style={{ marginTop: 4 }}>
                        <b>Atık türü:</b> {p.atik_turu_adi}
                      </div>
                    ) : null}
                    {p.address ? (
                      <div style={{ marginTop: 4 }}>
                        <b>Adres:</b> {p.address}
                      </div>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
