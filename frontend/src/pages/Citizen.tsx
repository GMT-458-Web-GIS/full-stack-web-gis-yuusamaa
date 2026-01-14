import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";

type ReportStatus = "pending" | "approved" | "rejected";

type LitterReport = {
  id: number;
  title: string | null;
  description: string | null;
  status: ReportStatus;
  photo_url: string | null;
  lat: number | null;
  lon: number | null;
  atik_turu_id: number | null;
  atik_turu_adi?: string | null;
  created_at?: string;
};

type WasteType = {
  id: number;
  code: string | null;
  name: string;
  category: string | null;
};

export default function Citizen() {
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string>("");

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);

  // ✅ waste types
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [wasteTypeId, setWasteTypeId] = useState<number | null>(null);

  const [sending, setSending] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const canSend = useMemo(() => {
    return (
      !!pos &&
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      wasteTypeId !== null &&
      !sending
    );
  }, [pos, title, description, wasteTypeId, sending]);

  useEffect(() => {
    // Citizen sayfasına gelince otomatik konum iste (zorunlu)
    if (!navigator.geolocation) {
      setGeoErr("Tarayıcın konum desteği vermiyor.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude });
        setGeoErr("");
      },
      () => {
        setGeoErr("Konum izni verilmedi. Devam etmek için izin vermelisin.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    // ✅ Waste types çek
    (async () => {
      const res = await apiFetch<WasteType[]>("/api/waste-types", { skipAuth: true });
      if (!res.ok) {
        setMsg(res.error || "Atık türleri alınamadı.");
        return;
      }
      setWasteTypes(res.data);
    })();
  }, []);

  async function submit() {
    setMsg("");

    if (!pos) {
      setMsg("Konum izni gerekli.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setMsg("Başlık ve açıklama zorunlu.");
      return;
    }
    if (wasteTypeId === null) {
      setMsg("Atık türü seçmelisin.");
      return;
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    fd.append("lat", String(pos.lat));
    fd.append("lon", String(pos.lon));
    fd.append("atik_turu_id", String(wasteTypeId)); // ✅ gerçek id
    if (photo) fd.append("photo", photo);

    setSending(true);
    const res = await apiFetch<LitterReport>("/api/litter-reports", {
      method: "POST",
      body: fd,
    });
    setSending(false);

    if (!res.ok) {
      setMsg(res.error || "Gönderim başarısız.");
      return;
    }

    setMsg("Bildirim gönderildi ✅ (Editor panelinde pending olarak görünecek)");
    setTitle("");
    setDescription("");
    setPhoto(null);
    setWasteTypeId(null);
  }

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
      <h2>Citizen Bildirim Paneli</h2>

      {!pos && (
        <div style={{ marginBottom: 12, color: "#b00020", fontWeight: 700 }}>
          {geoErr || "Konum alınıyor..."}
        </div>
      )}

      {pos && (
        <div style={{ marginBottom: 12, color: "#555" }}>
          Konum alındı: <b>{pos.lat.toFixed(6)}</b>, <b>{pos.lon.toFixed(6)}</b>
        </div>
      )}

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Başlık</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Parkta plastik atık"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Detaylı Açıklama</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Atığın yeri, yoğunluğu, çevreye etkisi vb."
            rows={4}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        {/* ✅ Atık türü seçimi */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>Atık türü seçiniz</span>
          <select
            value={wasteTypeId ?? ""}
            onChange={(e) => setWasteTypeId(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="">Seçiniz...</option>
            {wasteTypes.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id} - {w.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Fotoğraf Yükle</span>
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>

        <button
          onClick={submit}
          disabled={!canSend}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: canSend ? "pointer" : "not-allowed",
            fontWeight: 800,
          }}
        >
          {sending ? "Gönderiliyor..." : "Bildirimi Gönder"}
        </button>

        {msg && <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div>}
      </div>
    </div>
  );
}
