import React, { useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { X, MapPin, Loader2, Navigation, Check } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 15.3647,
  lng: 75.1240
};

const LIBRARIES = ['places', 'geometry'];

const DeliveryLocationModal = ({ isOpen, onClose, initialCoords, onConfirm, shopLocation }) => {
  const [currentCoords, setCurrentCoords] = useState(initialCoords || defaultCenter);
  const [mapType, setMapType] = useState('roadmap');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(currentCoords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:max-w-4xl md:h-[80vh] md:rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative border border-white/20">
        
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4 pointer-events-auto">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tighter uppercase leading-none">Set Delivery Location</h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Click anywhere or drag the blue marker</p>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setMapType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
              className="px-4 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-xl hover:bg-blue-50 transition-all border border-white/20"
            >
              {mapType === 'roadmap' ? 'Satellite View' : 'Map View'}
            </button>
            <button 
              onClick={onClose}
              className="w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center text-gray-900 shadow-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 border border-white/20"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-gray-50 relative">
          {!isLoaded ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Loading Map Terminal...</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={currentCoords}
              zoom={18}
              mapTypeId={mapType}
              onClick={(e) => {
                setCurrentCoords({
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                });
              }}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {/* Shop Marker (Reference) */}
              {shopLocation && (
                <Marker 
                  position={shopLocation}
                  icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                    fillColor: "#E65100", // Orange for shop
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#ffffff",
                    scale: 1.5,
                    anchor: new google.maps.Point(12, 22)
                  }}
                  title="Shop Location"
                />
              )}

              {/* User Delivery Marker */}
              <Marker 
                position={currentCoords}
                draggable={true}
                onDragEnd={(e) => {
                  setCurrentCoords({
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng()
                  });
                }}
                icon={{
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                  fillColor: "#3B82F6", // Blue for user
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#ffffff",
                  scale: 2,
                  anchor: new google.maps.Point(12, 22)
                }}
                title="Your Delivery Point (Drag to Move)"
              />
            </GoogleMap>
          )}
        </div>

        {/* Footer Overlay */}
        <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
               <Navigation size={20} />
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Coordinates</p>
               <p className="text-xs font-black text-gray-900">{currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}</p>
             </div>
           </div>

           <button 
             onClick={handleConfirm}
             className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95"
           >
             Confirm Delivery Location <Check size={18} strokeWidth={3} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLocationModal;
