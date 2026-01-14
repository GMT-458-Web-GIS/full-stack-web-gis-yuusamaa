// frontend/src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type LitterReportStatus = "pending" | "approved" | "rejected";

type LitterReport = {
  id: number;
  title?: string | null;
  description?: string | null;
  status: LitterReportStatus;
  address_text?: string | null;
  photo_url?: string | null;
  lat?: number | null;
  lon?: number | null;
  created_at?: string;
  updated_at?: string;
};

type EditorCred = {
  email: string;
  password: string;
};

type ChangeRequest = {
  id: number;
  report_id: number;
  message: string;
  status: "open" | "resolved" | "closed";
  created_at: string;
  requested_by: number | null;
  requested_by_email: string | null;
  title: string | null;
  report_status: LitterReportStatus;
};

export default function Admin() {
  const [err, setErr] = useState<string>("");

  const [approved, setApproved] = useState<LitterReport[]>([]);
  const [rejected, setRejected] = useState<LitterReport[]>([]);

  const [editorEmail, setEditorEmail] = useState("");
  const [editorPass, setEditorPass] = useState("");

  const [changeReqs, setChangeReqs] = useState<ChangeRequest[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr("");

    const a = await apiFetch<LitterReport[]>("/api/litter-reports?status=approved");
    const r = await apiFetch<LitterReport[]>("/api/litter-reports?status=rejected");
    const e = await apiFetch<EditorCred>("/api/admin/editor-credentials");
    const cr = await apiFetch<ChangeRequest[]>("/api/admin/change-requests?status=open");

    if (!a.ok) setErr((prev) => prev || a.error || "Approved load failed");
    if (!r.ok) setErr((prev) => prev || r.error || "Rejected load failed");
    if (!e.ok) setErr((prev) => prev || e.error || "Editor credentials load failed");
    if (!cr.ok) setErr((prev) => prev || cr.error || "Change requests load failed");

    if (a.ok) setApproved(a.data);
    if (r.ok) setRejected(r.data);
    if (e.ok) {
      setEditorEmail(e.data.email);
      setEditorPass(e.data.password);
    }
    if (cr.ok) setChangeReqs(cr.data);
  }

  async function saveEditor() {
    setErr("");
    setBusy(true);
    try {
      const res = await apiFetch<{ ok: true }>("/api/admin/editor-credentials", {
        method: "PUT",
        body: JSON.stringify({ email: editorEmail, password: editorPass }),
      });

      if (!res.ok) {
        setErr(res.error || "Kaydetme başarısız");
        return;
      }

      alert("Kaydedildi");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revertChangeRequest(id: number) {
    setErr("");
    setBusy(true);
    try {
      const ok = window.confirm(
        "Bu değişiklik talebini ONAYLAYIP işlemi geri almak istiyor musun?\n" +
          "Rapor pending'e dönecek ve editor panelinde tekrar görünecek."
      );
      if (!ok) return;

      const res = await apiFetch(`/api/admin/change-requests/${id}/revert`, {
        method: "POST",
      });

      if (!res.ok) {
        setErr(res.error || "Geri alma başarısız");
        return;
      }

      await load();
    } finally {
      setBusy(false);
    }
  }

  async function closeChangeRequest(id: number) {
    setErr("");
    setBusy(true);
    try {
      const ok = window.confirm("Bu değişiklik talebini kapatmak istiyor musun? (Geri alma yapılmaz)");
      if (!ok) return;

      const res = await apiFetch(`/api/admin/change-requests/${id}/close`, {
        method: "POST",
      });

      if (!res.ok) {
        setErr(res.error || "Kapatma başarısız");
        return;
      }

      await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Panel</h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            Onaylanan / reddedilen bildirimleri yönet, Editor hesabını güncelle ve değişiklik taleplerini değerlendir.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            ← Haritaya Dön
          </a>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={load} disabled={busy}>
          Yenile
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 24,
          marginTop: 18,
          alignItems: "start",
        }}
      >
        {/* Sol: Editor hesabı */}
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            padding: 14,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Editor Hesabı</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Editor Email</span>
              <input
                value={editorEmail}
                onChange={(e) => setEditorEmail(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Editor Şifre</span>
              <input
                value={editorPass}
                onChange={(e) => setEditorPass(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={saveEditor} disabled={busy}>
                Kaydet
              </button>
              <span style={{ fontSize: 12, color: "#777" }}>
                (DEV: şu an credentials store ile kaydediliyor)
              </span>
            </div>
          </div>
        </div>

        {/* Sağ: Bildirim + Değişiklik Talepleri */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Değişiklik Talepleri */}
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: 14,
              background: "#fff",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Değişiklik Talepleri ({changeReqs.length})</h2>

            {changeReqs.length === 0 ? (
              <p style={{ color: "#666" }}>Açık değişiklik talebi yok.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {changeReqs.map((x) => (
                  <div
                    key={x.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: 12,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      Talep #{x.id} → Rapor #{x.report_id}{" "}
                      {x.title ? `- ${x.title}` : ""}
                    </div>

                    <div style={{ marginTop: 6, color: "#444" }}>{x.message}</div>

                    <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                      Rapor durumu: <b>{x.report_status}</b> — İsteyen:{" "}
                      <b>{x.requested_by_email || "unknown"}</b>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button onClick={() => revertChangeRequest(x.id)} disabled={busy}>
                        İşlemi geri al (pending)
                      </button>
                      <button onClick={() => closeChangeRequest(x.id)} disabled={busy}>
                        Talebi kapat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
              “İşlemi geri al” seçilirse rapor <b>pending</b> olur ve editor panelinde yeniden görünür.
            </div>
          </div>

          {/* Bildirim Yönetimi */}
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: 14,
              background: "#fff",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Bildirim Yönetimi</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Onaylananlar ({approved.length})</h3>

                {approved.length === 0 ? (
                  <p style={{ color: "#666" }}>Gösterilecek kayıt yok.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {approved.map((x) => (
                      <li key={x.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 600 }}>
                          #{x.id} {x.title ? `- ${x.title}` : ""}
                        </div>
                        <div style={{ color: "#777", fontSize: 12 }}>
                          status: {x.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Reddedilenler ({rejected.length})</h3>

                {rejected.length === 0 ? (
                  <p style={{ color: "#666" }}>Gösterilecek kayıt yok.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {rejected.map((x) => (
                      <li key={x.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 600 }}>
                          #{x.id} {x.title ? `- ${x.title}` : ""}
                        </div>
                        <div style={{ color: "#777", fontSize: 12 }}>
                          status: {x.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div style={{ color: "#888", fontSize: 12 }}>
            Not: Admin panelindeki değişiklik talepleri “açık” olanlardır. İşlem yapınca listeden düşer.
          </div>
        </div>
      </div>
    </div>
  );
}
