import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function makeDotIcon(color: string, ring?: string) {
  const ringSvg = ring
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${ring}" stroke-width="2" opacity="0.5"/>
       <circle cx="16" cy="16" r="14" fill="none" stroke="${ring}" stroke-width="2" opacity="0.3"><animate attributeName="r" from="14" to="20" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`
    : '';
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      ${ringSvg}
      <circle cx="16" cy="16" r="9" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="3.5" fill="white" opacity="0.8"/>
    </svg>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

const adminIcon  = makeDotIcon('#3b82f6');                // blue — admin (you)
const insideIcon = makeDotIcon('#22c55e');                 // green — inside zone
const outsideIcon = makeDotIcon('#ef4444', '#ef4444');     // red + pulsing ring — outside zone
const fieldIcon  = makeDotIcon('#f59e0b');                 // amber — on field duty

export interface MapEmployee {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  insideGeofence: boolean;
  isFieldDuty?: boolean;
}

interface LiveMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  geofenceLat?: number;
  geofenceLng?: number;
  geofenceRadius?: number;
  employees?: MapEmployee[];
  selfMode?: boolean;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  selfLat?: number;
  selfLng?: number;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const firstRef = useRef(true);

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);

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

function getEmpIcon(emp: MapEmployee) {
  if (emp.isFieldDuty) return fieldIcon;
  return emp.insideGeofence ? insideIcon : outsideIcon;
}

function getEmpStatusLabel(emp: MapEmployee) {
  if (emp.isFieldDuty) return { text: 'On Field Duty', color: '#d97706' };
  if (emp.insideGeofence) return { text: 'Inside zone', color: '#16a34a' };
  return { text: 'Outside zone', color: '#dc2626' };
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
  onMapClick,
  selfLat,
  selfLng,
}: LiveMapProps) {
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
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

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

        {/* Admin's own GPS — blue dot */}
        {!selfMode && selfLat !== undefined && selfLng !== undefined && (
          <Marker position={[selfLat, selfLng]} icon={adminIcon}>
            <Popup>
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                <strong>You (Admin)</strong><br />
                <span style={{ color: '#3b82f6' }}>Live GPS</span>
              </div>
            </Popup>
          </Marker>
        )}

        {selfMode ? (
          employees.length > 0 && (
            <Marker position={[employees[0].lat, employees[0].lng]} icon={insideIcon}>
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  <strong>{employees[0].name}</strong><br />
                  <span style={{ color: '#16a34a' }}>{employees[0].status}</span>
                </div>
              </Popup>
            </Marker>
          )
        ) : (
          employees.map(emp => {
            const label = getEmpStatusLabel(emp);
            return (
              <Marker key={emp.id} position={[emp.lat, emp.lng]} icon={getEmpIcon(emp)}>
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 140 }}>
                    <strong style={{ fontSize: 13 }}>{emp.name}</strong><br />
                    <span style={{ color: '#64748b', fontSize: 10 }}>{emp.id}</span><br />
                    <b style={{ color: label.color }}>{label.text}</b>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>
    </div>
  );
}
