'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in Leaflet with React
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const CompetitorIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect?: (lat: number, lng: number) => void;
    markers?: { lat: number; lng: number; title: string; type?: 'competitor' | 'own' }[];
    radius?: number;
}

function LocationMarker({ position, setPosition, onLocationSelect }: { 
    position: [number, number] | null, 
    setPosition: (pos: [number, number]) => void,
    onLocationSelect?: (lat: number, lng: number) => void
}) {
    useMapEvents({
        click(e) {
            if (!onLocationSelect) return;
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            onLocationSelect(lat, lng);
        },
    });

    return position === null ? null : (
        <Marker position={position} />
    );
}

function MapResizer() {
    const map = useMapEvents({});
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);
    return null;
}

export default function LeafletMap({ initialLat, initialLng, onLocationSelect, markers = [], radius }: LeafletMapProps) {
    const [position, setPosition] = useState<[number, number] | null>(
        initialLat && initialLng ? [initialLat, initialLng] : [-6.2088, 106.8456] // Default Jakarta
    );

    return (
        <MapContainer 
            center={position || [-6.2088, 106.8456]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        >
            <MapResizer />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {onLocationSelect && (
                <LocationMarker 
                    position={position} 
                    setPosition={setPosition} 
                    onLocationSelect={onLocationSelect} 
                />
            )}

            {markers.map((m, i) => (
                <Marker 
                    key={i} 
                    position={[m.lat, m.lng]} 
                    icon={m.type === 'competitor' ? CompetitorIcon : DefaultIcon}
                >
                    <Popup>
                        <span className="font-bold uppercase text-[10px]">{m.title}</span>
                    </Popup>
                </Marker>
            ))}

            {radius && position && (
                <Circle 
                    center={position} 
                    radius={radius} 
                    pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1 }} 
                />
            )}
        </MapContainer>
    );
}
