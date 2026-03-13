'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in Leaflet with React
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition, onLocationSelect }: { 
    position: [number, number] | null, 
    setPosition: (pos: [number, number]) => void,
    onLocationSelect: (lat: number, lng: number) => void
}) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            onLocationSelect(lat, lng);
        },
    });

    return position === null ? null : (
        <Marker position={position} />
    );
}

export default function LeafletMap({ initialLat, initialLng, onLocationSelect }: LeafletMapProps) {
    const [position, setPosition] = useState<[number, number] | null>(
        initialLat && initialLng ? [initialLat, initialLng] : [-6.2088, 106.8456] // Default Jakarta
    );

    return (
        <MapContainer 
            center={position || [-6.2088, 106.8456]} 
            zoom={13} 
            style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
                position={position} 
                setPosition={setPosition} 
                onLocationSelect={onLocationSelect} 
            />
        </MapContainer>
    );
}
