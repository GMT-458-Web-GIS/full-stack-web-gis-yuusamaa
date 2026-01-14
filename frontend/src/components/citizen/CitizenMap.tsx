import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet default icon fix (Vite/TS projelerinde sık gerekir)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Props = {
  lat: number | null;
  lon: number | null;
  // confirmed ise marker sabit/aktif
  isConfirmed: boolean;
  // kullanıcı marker'ı sürükleyince güncellemek istersen
  onChangeLatLon?: (lat: number, lon: number) => void;
};

function FlyToLocation({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lon], 16, { duration: 0.8 });
  }, [lat, lon, map]);

  return null;
}

export default function CitizenMap({ lat, lon, isConfirmed, onChangeLatLon }: Props) {
  const center = useMemo<[number, number]>(() => {
    // Ankara default (istersen kendi default’unu koy)
    return [39.92077, 32.85411];
  }, []);

  const hasPoint = lat !== null && lon !== null;

  return (
    <div style={{ height: 420, width: "100%", borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        center={hasPoint ? [lat!, lon!] : center}
        zoom={hasPoint ? 16 : 12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasPoint && <FlyToLocation lat={lat!} lon={lon!} />}

        {hasPoint && (
          <Marker
            position={[lat!, lon!]}
            draggable={isConfirmed && !!onChangeLatLon} // onChangeLatLon verirsen sürüklenebilir
            eventHandlers={
              isConfirmed && onChangeLatLon
                ? {
                    dragend: (e) => {
                      const m = e.target as L.Marker;
                      const p = m.getLatLng();
                      onChangeLatLon(p.lat, p.lng);
                    },
                  }
                : undefined
            }
          />
        )}
      </MapContainer>
    </div>
  );
}
