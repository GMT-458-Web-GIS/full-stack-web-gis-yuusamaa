import { useEffect, useMemo, useState } from "react";
import { apiFetch, resolveFileUrl } from "../api/client";

type ReportStatus = "pending" | "approved" | "rejected";

type LitterReport = {
  id: number;
  title: string | null;
  description: string | null;
  status: ReportStatus;
  address_text: string | null;
  photo_url: string | null;

  // ✅ yeni
  atik_turu_id: number | null;
  atik_turu_adi?: string | null;
  atik_turu_code?: string | null;

  created_by: number;
  approved_by: number | null;
  rejected_by: number | null;
  rejection_reason: string | null;
  lat: number | null;
  lon: number | null;
  created_at?: string;
  updated_at?: string;
};

function photoHref(photoUrl: string | null): string {
  if (!photoUrl) return "#";
  const resolved = resolveFileUrl(photoUrl);
  return resolved || photoUrl;
}

export default function Editor() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [pending, setPending] = useState<LitterReport[]>([]);
  const [historyApproved, setHistoryApproved] = useState<LitterReport[]>([]);
  const [historyRejected, setHistoryRejected] = useState<LitterReport[]>([]);

  const pendingCount = useMemo(() => pending.length, [pending]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const p = await apiFetch<LitterReport[]>("/api/litter-reports?status=pending");
      const a = await apiFetch<LitterReport[]>("/api/litter-reports?status=approved");
      const r = await apiFetch<LitterReport[]>("/api/litter-reports?status=rejected");

      if (!p.ok) setErr((prev) => prev || p.error || "Pending load failed");
      if (!a.ok) setErr((prev) => prev || a.error || "Approved load failed");
      if (!r.ok) setErr((prev) => prev || r.error || "Rejected load failed");

      if (p.ok) setPending(p.data);
      if (a.ok) setHistoryApproved(a.data);
      if (r.ok) setHistoryRejected(r.data);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: number) {
    setErr("");
    const res = await apiFetch(`/api/litter-reports/${id}/approve`, { method: "PATCH" });
    if (!res.ok) {
      setErr(res.error || "Onay başarısız");
      return;
    }
    await load();
  }

  async function reject(id: number) {
    setErr("");
    const reason = window.prompt("Reddetme sebebi:");
    if (reason === null) return;

    const res = await apiFetch(`/api/litter-reports/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      setErr(res.error || "Reddetme başarısız");
      return;
    }
    await load();
  }

  async function requestChange(id: number) {
    setErr("");
    const message = window.prompt("Değişiklik gerekçesini yaz:");
    if (message === null) return;

    const res = await apiFetch(`/api/litter-reports/${id}/change-request`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      setErr(res.error || "Değişiklik bildirimi başarısız");
      return;
    }

    alert("Değişiklik talebi admin'e iletildi.");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Editor Panel</h2>
          <div style={{ color: "#555" }}>Bekleyen bildirim: {pendingCount}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={load} disabled={loading}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
          <a href="/" style={{ textDecoration: "none" }}>
            ← Haritaya Dön
          </a>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>
      ) : null}

      {/* Pending */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Bekleyenler (pending)</h3>

        {pending.length === 0 ? (
          <div style={{ color: "#666" }}>Gösterilecek pending kayıt yok.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {pending.map((x) => (
              <div
                key={x.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 10,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      #{x.id} {x.title ? `- ${x.title}` : ""}
                    </div>

                    {/* ✅ Atık türü göster */}
                    <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>
                      Atık türü:{" "}
                      <b>{x.atik_turu_adi || (x.atik_turu_id ? `ID ${x.atik_turu_id}` : "Seçilmemiş")}</b>
                      {x.atik_turu_code ? <span style={{ color: "#777" }}> ({x.atik_turu_code})</span> : null}
                    </div>

                    {x.description ? (
                      <div style={{ marginTop: 6, color: "#444" }}>{x.description}</div>
                    ) : null}

                    {x.photo_url ? (
                      <div style={{ marginTop: 8 }}>
                        <a href={photoHref(x.photo_url)} target="_blank" rel="noreferrer">
                          Fotoğrafı aç
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                    <button onClick={() => approve(x.id)}>Onayla</button>
                    <button onClick={() => reject(x.id)}>Reddet</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div style={{ marginTop: 26 }}>
        <h3 style={{ marginBottom: 10 }}>Geçmiş İşlemler</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Approved */}
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: 14,
              background: "#fff",
              minHeight: 120,
            }}
          >
            <h4 style={{ marginTop: 0 }}>Onaylananlar ({historyApproved.length})</h4>
            {historyApproved.length === 0 ? (
              <div style={{ color: "#666" }}>Kayıt yok.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {historyApproved.map((x) => (
                  <li key={x.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>
                      #{x.id} {x.title ? `- ${x.title}` : ""}
                    </div>

                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      Atık türü: <b>{x.atik_turu_adi || (x.atik_turu_id ? `ID ${x.atik_turu_id}` : "?" )}</b>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                      {x.photo_url ? (
                        <a href={photoHref(x.photo_url)} target="_blank" rel="noreferrer">
                          Fotoğrafı aç
                        </a>
                      ) : (
                        <span style={{ color: "#888" }}>Fotoğraf yok</span>
                      )}
                      <button onClick={() => requestChange(x.id)}>Değişiklik için bildir</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rejected */}
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: 14,
              background: "#fff",
              minHeight: 120,
            }}
          >
            <h4 style={{ marginTop: 0 }}>Reddedilenler ({historyRejected.length})</h4>
            {historyRejected.length === 0 ? (
              <div style={{ color: "#666" }}>Kayıt yok.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {historyRejected.map((x) => (
                  <li key={x.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>
                      #{x.id} {x.title ? `- ${x.title}` : ""}
                    </div>

                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      Atık türü: <b>{x.atik_turu_adi || (x.atik_turu_id ? `ID ${x.atik_turu_id}` : "?" )}</b>
                    </div>

                    {x.rejection_reason ? (
                      <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                        Sebep: {x.rejection_reason}
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                      {x.photo_url ? (
                        <a href={photoHref(x.photo_url)} target="_blank" rel="noreferrer">
                          Fotoğrafı aç
                        </a>
                      ) : (
                        <span style={{ color: "#888" }}>Fotoğraf yok</span>
                      )}
                      <button onClick={() => requestChange(x.id)}>Değişiklik için bildir</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ marginTop: 10, color: "#777", fontSize: 12 }}>
          Not: Değişiklik talebini admin onaylarsa kayıt tekrar <b>pending</b> olur ve bu sayfada yeniden görünür.
        </div>
      </div>
    </div>
  );
}
