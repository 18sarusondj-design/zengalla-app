import React, { useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { X, Navigation, Store, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../common/components/Logo';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 15.3647,
  lng: 75.1240
};

const LIBRARIES = ['places', 'geometry'];

const ShopMapModal = ({ isOpen, onClose, shops, userCoords, onUserLocationChange }) => {
  const navigate = useNavigate();
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapType, setMapType] = useState('roadmap');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:max-w-6xl md:h-[85vh] md:rounded-[48px] overflow-hidden flex flex-col shadow-2xl relative border border-white/20">
        
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4 pointer-events-auto">
            <Logo variant="icon" className="w-10 h-10 rounded-2xl shadow-lg transform rotate-3" />
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tighter uppercase leading-none">Nearby Stores</h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Live Vendor Map • Karnataka</p>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setMapType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
              className="px-4 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-xl hover:bg-blue-50 transition-all border border-white/20"
            >
              {mapType === 'roadmap' ? 'Satellite View' : 'Map View'}
            </button>
            <button 
              onClick={onClose}
              className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-gray-900 shadow-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 border border-white/20"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-gray-50 relative">
          {!isLoaded ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-sky-600" size={40} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Initializing Map Infrastructure...</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userCoords || defaultCenter}
              zoom={18}
              mapTypeId={mapType}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {/* User Location Marker */}
              {userCoords && (
                <Marker 
                  position={userCoords}
                  draggable={true}
                  onDragEnd={(e) => {
                    const newCoords = {
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng()
                    };
                    onUserLocationChange(newCoords);
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
                  title="Your Location (Drag to correct)"
                />
              )}

              {shops?.filter(s => s.is_active && typeof s.location?.coordinates?.lat === 'number' && typeof s.location?.coordinates?.lng === 'number').map(shop => (
                <Marker 
                  key={shop._id}
                  position={{ 
                    lat: Number(shop.location.coordinates.lat), 
                    lng: Number(shop.location.coordinates.lng) 
                  }}
                  onClick={() => setSelectedShop(shop)}
                />
              ))}

              {selectedShop && (
                <InfoWindow
                  position={{ 
                    lat: Number(selectedShop.location.coordinates.lat), 
                    lng: Number(selectedShop.location.coordinates.lng) 
                  }}
                  onCloseClick={() => setSelectedShop(null)}
                >
                  <div className="p-2 min-w-[220px] max-w-[280px] font-sans">
                    <div className="border-none bg-transparent">
                      <div className="h-24 w-full rounded-xl overflow-hidden mb-3 shadow-sm bg-gray-50">
                        <img 
                          src={selectedShop.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'} 
                          className="w-full h-full object-cover" 
                          alt="Shop"
                        />
                      </div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">{selectedShop.name}</h4>
                      <div className="flex items-center gap-1.5 text-gray-400 mb-4">
                        <MapPin size={10} />
                        <p className="text-[9px] font-bold truncate tracking-widest leading-none">{selectedShop.location?.address || 'Verified Location'}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          onClose();
                          navigate(`/shop/${selectedShop._id}`);
                        }}
                        className="w-full py-3 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sky-700 transition shadow-lg shadow-sky-50"
                      >
                        Visit Shop <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Legend/Footer Overlay */}
        <div className="absolute bottom-6 left-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
           <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{shops?.filter(s => s.is_active && typeof s.location?.coordinates?.lat === 'number' && typeof s.location?.coordinates?.lng === 'number').length || 0} Active Vendors Found</span>
        </div>
      </div>
    </div>
  );
};

export default ShopMapModal;
