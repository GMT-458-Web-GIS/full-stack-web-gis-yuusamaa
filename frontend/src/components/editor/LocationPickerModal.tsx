import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  open: boolean;
  title?: string;
  addressText?: string | null;
  initialLat?: number | null;
  initialLon?: number | null;
  onClose: () => void;
  onSave: (lat: number, lon: number) => Promise<void> | void;
};

function ClickToSetMarker({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerModal({
  open,
  title,
  addressText,
  initialLat,
  initialLon,
  onClose,
  onSave,
}: Props) {
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(
    initialLat != null && initialLon != null ? { lat: initialLat, lon: initialLon } : null
  );
  const [saving, setSaving] = useState(false);

  const center = useMemo<[number, number]>(() => {
    // Ankara default; istersen İstanbul vs.
    if (picked) return [picked.lat, picked.lon];
    return [39.92077, 32.85411];
  }, [picked]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          background: "white",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Konum Ekle / Güncelle
          </div>
          {title && <div style={{ marginTop: 4, opacity: 0.85 }}>🗑️ {title}</div>}
          {addressText && (
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              📍 Adres: {addressText}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
            Haritada tıklayarak konum seç.
          </div>
        </div>

        <div style={{ height: 480, width: "100%" }}>
          <MapContainer center={center} zoom={picked ? 16 : 12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToSetMarker
              onPick={(lat, lon) => setPicked({ lat, lon })}
            />
            {picked && <Marker position={[picked.lat, picked.lon]} />}
          </MapContainer>
        </div>

        <div
          style={{
            padding: 14,
            borderTop: "1px solid #eee",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <button type="button" onClick={onClose} style={{ padding: "8px 12px" }}>
            Kapat
          </button>

          <button
            type="button"
            disabled={!picked || saving}
            onClick={async () => {
              if (!picked) return;
              setSaving(true);
              try {
                await onSave(picked.lat, picked.lon);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            style={{ padding: "8px 12px" }}
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
