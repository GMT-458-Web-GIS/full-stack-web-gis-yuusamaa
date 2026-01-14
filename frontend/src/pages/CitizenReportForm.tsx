import { useEffect, useMemo, useState } from "react";
import CitizenMap from "../components/citizen/CitizenMap";
import { createLitterReport } from "../api/litterReports";

type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "confirmed"
  | "rejected";

const isValidNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export default function CitizenReportForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);

  const [addressText, setAddressText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const addressRequired = useMemo(() => {
    return locationStatus === "denied" || locationStatus === "rejected";
  }, [locationStatus]);

  const requestLocation = () => {
    setLocationStatus("requesting");

    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConfirmed = locationStatus === "confirmed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!title.trim()) return setError("Başlık zorunludur.");
    if (!file) return setError("Fotoğraf zorunludur.");

    const hasCoords = isValidNumber(lat) && isValidNumber(lon);

    if (!hasCoords && addressText.trim().length === 0) {
      return setError("Konum yoksa adres zorunludur.");
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("description", description.trim());

    if (hasCoords) {
      fd.append("lat", String(lat));
      fd.append("lon", String(lon));

      if (addressText.trim().length > 0) {
        fd.append("address_text", addressText.trim());
      }
    } else {
      // ✅ lat/lon kesinlikle eklenmiyor
      fd.append("address_text", addressText.trim());
    }

    fd.append("photo", file);

    setSubmitting(true);
    try {
      await createLitterReport(fd);
      setOkMsg("Bildirim gönderildi ✅");

      setTitle("");
      setDescription("");
      setFile(null);
      setAddressText("");
    } catch (err: any) {
      setError(err?.message ?? "Bildirim gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2>Yeni Atık Bildirimi</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Başlık</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Fotoğraf</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <CitizenMap
          lat={lat}
          lon={lon}
          isConfirmed={isConfirmed}
          onChangeLatLon={(newLat, newLon) => {
            setLat(newLat);
            setLon(newLon);
          }}
        />

        {locationStatus === "requesting" && <p>Konum alınıyor…</p>}

        {locationStatus === "granted" && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span>📍 Bu konum doğru mu?</span>

            <button type="button" onClick={() => setLocationStatus("confirmed")} style={{ padding: "8px 12px" }}>
              ✔ Evet
            </button>

            <button
              type="button"
              onClick={() => {
                setLat(null);
                setLon(null);
                setLocationStatus("rejected");
              }}
              style={{ padding: "8px 12px" }}
            >
              ❌ Hayır
            </button>
          </div>
        )}

        {locationStatus === "denied" && (
          <div style={{ marginTop: 12 }}>
            <p>Konum izni verilmedi. Lütfen adres gir.</p>
            <button type="button" onClick={requestLocation} style={{ padding: "8px 12px" }}>
              Konumu tekrar dene
            </button>
          </div>
        )}

        {(addressRequired || addressText.trim().length > 0) && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              {addressRequired ? "Adres (zorunlu)" : "(Opsiyonel) Adres Notu"}
            </label>
            <textarea
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: 10 }}
              placeholder="Örn: Beytepe Kampüsü, XYZ bina arkası…"
            />
          </div>
        )}

        {isConfirmed && (
          <p style={{ marginTop: 10, opacity: 0.8 }}>
            İstersen marker’ı sürükleyerek konumu biraz düzeltebilirsin.
          </p>
        )}

        {error && <div style={{ marginTop: 10, color: "#ff5a5a" }}>❌ {error}</div>}
        {okMsg && <div style={{ marginTop: 10 }}>{okMsg}</div>}

        <button type="submit" disabled={submitting} style={{ marginTop: 12, padding: "10px 14px" }}>
          {submitting ? "Gönderiliyor…" : "Bildirimi Gönder"}
        </button>
      </form>
    </div>
  );
}
