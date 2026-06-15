import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Inline SVG markers — no CDN dependency, always works in Capacitor APK
function makeDotIcon(color: string) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.8"/>
    </svg>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

const selfIcon    = makeDotIcon('#22c55e');   // green — self
const insideIcon  = makeDotIcon('#3b82f6');   // blue  — inside geofence
const outsideIcon = makeDotIcon('#ef4444');   // red   — outside geofence

export interface MapEmployee {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  insideGeofence: boolean;
}

interface LiveMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  /** Fixed office/geofence centre. Only shown in admin (non-selfMode) view. */
  geofenceLat?: number;
  geofenceLng?: number;
  geofenceRadius?: number;
  employees?: MapEmployee[];
  selfMode?: boolean;
  height?: string;
}

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const firstRef = useRef(true);

  // Fix grey-tile sizing bug: Leaflet measures the container before it's painted
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);

  // Update map position when GPS changes:
  // - First fix: animate with flyTo so it feels alive
  // - Subsequent updates: instant setView so the map doesn't constantly chase the pin
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 1.2 });
    } else {
      map.setView([lat, lng], map.getZoom(), { animate: false });
    }
  }, [lat, lng, map]);

  return null;
}

export default function LiveMap({
  centerLat,
  centerLng,
  zoom = 16,
  geofenceLat,
  geofenceLng,
  geofenceRadius = 300,
  employees = [],
  selfMode = false,
  height = '300px',
}: LiveMapProps) {
  // Geofence circle center: use explicit geofence coords if provided,
  // otherwise fall back to map centre (admin view default)
  const fenceLat = geofenceLat ?? centerLat;
  const fenceLng = geofenceLng ?? centerLng;

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging
        touchZoom
        doubleClickZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          keepBuffer={4}
        />

        <MapController lat={centerLat} lng={centerLng} />

        {/* Geofence boundary — only shown in admin view (not selfMode) */}
        {!selfMode && (
          <Circle
            center={[fenceLat, fenceLng]}
            radius={geofenceRadius}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.07,
              weight: 2,
              dashArray: '6 4',
            }}
          />
        )}

        {selfMode ? (
          employees.length > 0 && (
            <Marker position={[employees[0].lat, employees[0].lng]} icon={selfIcon}>
              <Popup>
                <strong>{employees[0].name}</strong><br />
                {employees[0].lat.toFixed(5)}, {employees[0].lng.toFixed(5)}<br />
                {employees[0].status}
              </Popup>
            </Marker>
          )
        ) : (
          employees.map(emp => (
            <Marker
              key={emp.id}
              position={[emp.lat, emp.lng]}
              icon={emp.insideGeofence ? insideIcon : outsideIcon}
            >
              <Popup>
                <strong>{emp.name}</strong><br />
                {emp.lat.toFixed(5)}, {emp.lng.toFixed(5)}<br />
                <b style={{ color: emp.insideGeofence ? '#16a34a' : '#dc2626' }}>
                  {emp.insideGeofence ? 'Inside zone' : '⚠ Outside zone'}
                </b>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
