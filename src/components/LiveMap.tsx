import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  selfMode?: boolean;         // employee self-view: single pin
  height?: string;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng]);
  return null;
}

export default function LiveMap({
  centerLat,
  centerLng,
  zoom = 16,
  geofenceRadius = 300,
  employees = [],
  selfMode = false,
  height = '360px',
}: LiveMapProps) {
  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap lat={centerLat} lng={centerLng} />

        {/* Geofence boundary circle */}
        <Circle
          center={[centerLat, centerLng]}
          radius={geofenceRadius}
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.06, weight: 2, dashArray: '6 4' }}
        />

        {selfMode ? (
          // Employee self-view: single blue marker
          employees.length > 0 && (
            <Marker position={[employees[0].lat, employees[0].lng]} icon={greenIcon}>
              <Popup>
                <strong>{employees[0].name}</strong><br />
                {employees[0].lat.toFixed(5)}, {employees[0].lng.toFixed(5)}<br />
                Status: {employees[0].status}
              </Popup>
            </Marker>
          )
        ) : (
          // Admin view: all employee pins
          employees.map(emp => (
            <Marker
              key={emp.id}
              position={[emp.lat, emp.lng]}
              icon={emp.insideGeofence ? greenIcon : redIcon}
            >
              <Popup>
                <strong>{emp.name}</strong><br />
                {emp.lat.toFixed(5)}, {emp.lng.toFixed(5)}<br />
                Status: <b style={{ color: emp.insideGeofence ? 'green' : 'red' }}>
                  {emp.insideGeofence ? 'Inside geofence' : '⚠ Outside geofence'}
                </b>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
