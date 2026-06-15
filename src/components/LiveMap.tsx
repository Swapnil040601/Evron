import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Inline SVG markers — no CDN dependency, always work offline in Capacitor
function makeDotIcon(color: string) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="8" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="11" cy="11" r="3" fill="white" opacity="0.7"/>
    </svg>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

const selfIcon = makeDotIcon('#22c55e');   // green — self location
const insideIcon = makeDotIcon('#3b82f6'); // blue — inside geofence
const outsideIcon = makeDotIcon('#ef4444'); // red — outside geofence

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
  geofenceRadius?: number;
  employees?: MapEmployee[];
  selfMode?: boolean;
  height?: string;
}

// Recenters map smoothly when coordinates change; also fixes Leaflet sizing on mount
function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    // Fix common Capacitor/WebView sizing bug: Leaflet initializes before
    // the container is fully painted, leaving grey tiles. invalidateSize() redraws.
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 1 });
  }, [lat, lng, map]);

  return null;
}

export default function LiveMap({
  centerLat,
  centerLng,
  zoom = 16,
  geofenceRadius = 300,
  employees = [],
  selfMode = false,
  height = '300px',
}: LiveMapProps) {
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

        {/* Geofence boundary */}
        <Circle
          center={[centerLat, centerLng]}
          radius={geofenceRadius}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.07,
            weight: 2,
            dashArray: '6 4',
          }}
        />

        {selfMode ? (
          employees.length > 0 && (
            <Marker position={[employees[0].lat, employees[0].lng]} icon={selfIcon}>
              <Popup>
                <strong>{employees[0].name}</strong><br />
                {employees[0].lat.toFixed(5)}, {employees[0].lng.toFixed(5)}<br />
                Status: {employees[0].status}
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
                Status: <b style={{ color: emp.insideGeofence ? '#16a34a' : '#dc2626' }}>
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
