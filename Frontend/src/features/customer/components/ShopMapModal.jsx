import React, { useState } from 'react';
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

import LeafletMap from '../../common/components/LeafletMap';

const ShopMapModal = ({ isOpen, onClose, shops, userCoords, onUserLocationChange }) => {
  const navigate = useNavigate();
  const [showSatellite, setShowSatellite] = useState(true);

  if (!isOpen) return null;

  const markers = shops?.filter(s => s.isActive && Array.isArray(s.location?.coordinates)).map(shop => ({
    lat: Number(shop.location.coordinates[1]),
    lng: Number(shop.location.coordinates[0]),
    content: (
      <div className="p-2 min-w-[220px] max-w-[280px] font-sans">
        <div className="border-none bg-transparent">
          <div className="h-24 w-full rounded-xl overflow-hidden mb-3 shadow-sm bg-gray-50">
            <img 
              src={shop.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'} 
              className="w-full h-full object-cover" 
              alt="Shop"
            />
          </div>
          <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">{shop.name}</h4>
          <div className="flex items-center gap-1.5 text-gray-400 mb-4">
            <MapPin size={10} />
            <p className="text-[9px] font-bold truncate tracking-widest leading-none">{shop.location?.address || 'Verified Location'}</p>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              onClose();
              navigate(`/shop/${shop._id}`);
            }}
            className="w-full py-3 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sky-700 transition shadow-lg shadow-sky-50"
          >
            Visit Shop <ExternalLink size={12} />
          </button>
        </div>
      </div>
    )
  })) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:max-w-6xl md:h-[85vh] md:rounded-[48px] overflow-hidden flex flex-col shadow-2xl relative border border-white/20">
        
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 z-[1000] flex items-center justify-between pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4 pointer-events-auto">
            <Logo variant="icon" className="w-10 h-10 rounded-2xl shadow-lg transform rotate-3" />
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tighter uppercase leading-none">Nearby Stores</h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Live Vendor Map • Karnataka</p>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setShowSatellite(prev => !prev)}
              className="px-4 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-xl hover:bg-blue-50 transition-all border border-white/20"
            >
              {showSatellite ? 'Map View' : 'Satellite View'}
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
          <LeafletMap 
            height="100%"
            userCoords={userCoords}
            onUserLocationChange={onUserLocationChange}
            markers={markers}
            showSatellite={showSatellite}
            zoom={19}
          />
          
          {/* Small Detect Location Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!navigator.geolocation) return toast.error("Geolocation not supported");
              const tid = toast.loading("Detecting your location...");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  onUserLocationChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  toast.success("Located!", { id: tid });
                },
                (err) => {
                  toast.error("Enable GPS access", { id: tid });
                }
              );
            }}
            className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-blue-600 hover:scale-110 active:scale-95 transition-all border border-gray-100"
            title="Locate Me"
          >
            <Navigation size={20} fill="currentColor" />
          </button>
        </div>

        {/* Legend/Footer Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
           <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{markers.length} Active Vendors Found</span>
        </div>
      </div>
    </div>
  );
};

export default ShopMapModal;
