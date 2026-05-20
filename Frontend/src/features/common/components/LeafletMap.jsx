import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Helpers ---
const isValidCoords = (coords) => {
  if (!coords) return false;
  // Handle Array [lat, lng]
  if (Array.isArray(coords)) {
    return coords.length >= 2 && 
           typeof coords[0] === 'number' && 
           typeof coords[1] === 'number' &&
           (coords[0] !== 0 || coords[1] !== 0);
  }
  // Handle Object {lat, lng}
  return typeof coords.lat === 'number' && 
         typeof coords.lng === 'number' && 
         (coords.lat !== 0 || coords.lng !== 0);
};

const getLatLngArray = (coords) => {
  if (Array.isArray(coords)) return coords;
  return [coords.lat, coords.lng];
};

// --- Sub-components for Map Logic ---

function LocationMarker({ onLocationFound }) {
  const map = useMap();
  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, map.getZoom());
      if (onLocationFound) onLocationFound(e.latlng);
    });
  }, [map]);
  return null;
}

function MapEventsHandler({ onClick }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng);
    },
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (isValidCoords(center)) {
      map.setView(getLatLngArray(center));
    }
  }, [center, map]);
  return null;
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  const isFirstRender = React.useRef(true);
  const prevZoom = React.useRef(zoom);

  useEffect(() => {
    if (isValidCoords(center)) {
      let targetZoom = map.getZoom();
      
      if (isFirstRender.current || prevZoom.current !== zoom) {
        targetZoom = zoom || targetZoom;
        isFirstRender.current = false;
        prevZoom.current = zoom;
      }

      map.flyTo(getLatLngArray(center), targetZoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  return null;
}

// --- Main Component ---

const LeafletMap = ({ 
  center = [15.3647, 75.1240], 
  zoom = 13, 
  markers = [], 
  polyline = null, 
  onLocationSelect, 
  userCoords = null,
  onUserLocationChange,
  autoDetect = true,
  height = "400px",
  className = "",
  showSatellite = false,
  interactive = true
}) => {
  const [selectedPos, setSelectedPos] = useState(null);
  const defaultCenter = center;


  const mapCenter = useMemo(() => {
    // Priority: User Coords (GPS/Detection) > Selected Pos (Manual Click) > Default Center
    if (isValidCoords(userCoords)) return getLatLngArray(userCoords);
    if (isValidCoords(selectedPos)) return getLatLngArray(selectedPos);
    
    // Handle array or object center
    if (isValidCoords(defaultCenter)) return getLatLngArray(defaultCenter);
    
    return [15.3647, 75.1240]; // Final fallback
  }, [selectedPos, userCoords, defaultCenter]);

  // High-reliability tile servers
  // Standard OSM for Roadmap (very reliable)
  const streetUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  // Google Hybrid for Satellite (familiar and high detail)
  const satelliteUrl = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  function ResizeHandler() {
    const map = useMap();
    useEffect(() => {
      // Immediate refresh
      map.invalidateSize();
      
      // Delayed refreshes to catch animation frames
      const timer1 = setTimeout(() => map.invalidateSize(), 100);
      const timer2 = setTimeout(() => map.invalidateSize(), 500);
      const timer3 = setTimeout(() => map.invalidateSize(), 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }, [map]);
    return null;
  }

  const handleMapClick = (latlng) => {
    if (!interactive) return;
    setSelectedPos(latlng);
    if (onLocationSelect) {
      onLocationSelect({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  const userIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 bg-blue-400/30 rounded-full animate-ping"></div>
        <div class="relative bg-blue-600 w-4 h-4 rounded-full border-2 border-white shadow-lg shadow-blue-500/50"></div>
      </div>
    `,
    className: 'custom-user-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <div style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden' }} className={className}>
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={interactive} 
        dragging={interactive}
        zoomControl={false}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        style={{ height: '100%', width: '100%' }}
      >
        {showSatellite ? (
          <TileLayer
            key="satellite"
            attribution='&copy; Google Maps'
            url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
          />
        ) : (
          <TileLayer
            key="roadmap"
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={['a', 'b', 'c']}
            maxZoom={19}
          />
        )}
        
        {autoDetect && !isValidCoords(userCoords) && !isValidCoords(selectedPos) && (
          <LocationMarker onLocationFound={handleMapClick} />
        )}

        {isValidCoords(userCoords) && (
          <>
            <Circle 
              center={getLatLngArray(userCoords)}
              radius={userCoords.accuracy || 20}
              pathOptions={{ 
                fillColor: '#3B82F6', 
                fillOpacity: 0.15, 
                color: '#3B82F6', 
                weight: 1,
                dashArray: '5, 5'
              }}
            />
            <Marker 
              position={getLatLngArray(userCoords)} 
              icon={userIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  if (onUserLocationChange) onUserLocationChange(position);
                },
              }}
            >
              <Popup>Your Location (Drag to move)</Popup>
            </Marker>
          </>
        )}

        {isValidCoords(selectedPos) && (
          <>
            <Circle 
              center={getLatLngArray(selectedPos)}
              radius={30}
              pathOptions={{ 
                fillColor: '#EF4444', 
                fillOpacity: 0.2, 
                color: '#EF4444', 
                weight: 2 
              }}
            />
            <Marker position={getLatLngArray(selectedPos)}>
              <Popup>Selected Location</Popup>
            </Marker>
          </>
        )}

        {markers.map((m, idx) => {
          if (!isValidCoords(m)) return null;
          const icon = m.icon ? m.icon : (m.iconUrl ? L.icon({
            iconUrl: m.iconUrl,
            iconSize: m.iconSize || [40, 40],
            iconAnchor: m.iconAnchor || [20, 20],
          }) : DefaultIcon);

          return (
            <Marker key={idx} position={getLatLngArray(m)} icon={icon}>
              {m.content ? (
                <Popup>{m.content}</Popup>
              ) : (
                m.label && <Popup>{m.label}</Popup>
              )}
            </Marker>
          );
        })}

        {polyline && Array.isArray(polyline) && (
          <Polyline 
            positions={polyline.filter(p => isValidCoords(p)).map(p => getLatLngArray(p))} 
            color="#f97316" 
            weight={4}
            dashArray="10, 10"
          />
        )}

        <MapEventsHandler onClick={handleMapClick} />
        <ChangeView center={mapCenter} zoom={zoom} />
        <ResizeHandler />
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
