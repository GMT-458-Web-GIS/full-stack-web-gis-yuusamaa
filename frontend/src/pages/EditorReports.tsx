import { useEffect, useMemo, useState } from "react";
import {
  getLitterReports,
  updateLitterReportLocation,
  type LitterReport,
} from "../api/litterReports";
import LocationPickerModal from "../components/editor/LocationPickerModal";

export default function EditorReports() {
  const [reports, setReports] = useState<LitterReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LitterReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Editör: genelde pending listesi
      const res = await getLitterReports({ status: "pending" });
      if (!res.ok) {
        setError(res.error || "Liste alınamadı.");
        setReports([]);
        return;
      }
      setReports(res.data);
    } catch (e: any) {
      setError(e?.message ?? "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const rows = useMemo(() => reports, [reports]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2>Editör Bildirimleri</h2>

      <div style={{ marginBottom: 10, opacity: 0.8 }}>
        Konumu eksik olanları haritadan işaretleyip kaydedebilirsin.
      </div>

      {error && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            border: "1px solid #f3c2c2",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      )}

      {loading && <p>Yükleniyor…</p>}

      {!loading && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={{ textAlign: "left", padding: 10 }}>Başlık</th>
                <th style={{ textAlign: "left", padding: 10 }}>Adres</th>
                <th style={{ textAlign: "left", padding: 10 }}>Konum</th>
                <th style={{ textAlign: "right", padding: 10 }}>İşlem</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const missingGeom = r.lat == null || r.lon == null;

                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        #{r.id} • {r.status}
                      </div>
                    </td>

                    <td style={{ padding: 10, opacity: 0.9 }}>
                      {r.address_text ?? <span style={{ opacity: 0.5 }}>—</span>}
                    </td>

                    <td style={{ padding: 10 }}>
                      {missingGeom ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid #c026d3",
                            fontSize: 12,
                          }}
                        >
                          Konum Eksik
                        </span>
                      ) : (
                        <span style={{ opacity: 0.8, fontSize: 12 }}>
                          {r.lat?.toFixed(5)}, {r.lon?.toFixed(5)}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: 10, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        style={{ padding: "8px 12px" }}
                      >
                        {missingGeom ? "Konum Ekle" : "Konumu Düzenle"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 14, opacity: 0.7 }}>
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <LocationPickerModal
        open={!!selected}
        title={selected?.title}
        addressText={selected?.address_text}
        initialLat={selected?.lat ?? null}
        initialLon={selected?.lon ?? null}
        onClose={() => setSelected(null)}
        onSave={async (lat, lon) => {
          if (!selected) return;
          await updateLitterReportLocation(selected.id, lat, lon);
          await fetchReports();
        }}
      />
    </div>
  );
}
