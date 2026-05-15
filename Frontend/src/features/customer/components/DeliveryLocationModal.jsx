import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Navigation, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

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

const DeliveryLocationModal = ({ isOpen, onClose, initialCoords, onConfirm, shopLocation }) => {
  const [currentCoords, setCurrentCoords] = useState(initialCoords || defaultCenter);
  const [showSatellite, setShowSatellite] = useState(true);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && currentCoords) {
      fetchAddress(currentCoords);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fetchAddress = async (coords) => {
    setFetching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&addressdetails=1&accept-language=en`);
      const data = await res.json();
      if (data) {
        const poiName = data.address?.shop || data.address?.amenity || data.address?.building || data.address?.office || data.address?.tourism;
        const subArea = data.address?.neighbourhood || data.address?.suburb || data.address?.hamlet || data.address?.village || data.address?.residential;
        
        let fullAddr = data.display_name;
        if (poiName && !fullAddr.startsWith(poiName)) fullAddr = `${poiName}, ${fullAddr}`;
        if (subArea && !fullAddr.includes(subArea)) fullAddr = `${subArea}, ${fullAddr}`;
        
        setAddress(fullAddr);
        setPincode(data.address?.postcode?.split(' ')[0].replace(/\D/g, '').substring(0, 6) || data.display_name.match(/\b\d{6}\b/)?.[0] || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({ ...currentCoords, address, pincode });
    onClose();
  };

  const markers = [];
  if (shopLocation) {
    markers.push({
      lat: shopLocation.lat,
      lng: shopLocation.lng,
      label: "Shop Location"
    });
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:max-w-4xl md:h-[90vh] md:rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative border border-white/20">
        
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 pointer-events-auto w-full md:w-auto">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 md:hidden">
               <p className="text-[10px] font-black text-gray-900 uppercase">Select Location</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-[20px] shadow-xl border border-gray-100 pointer-events-auto w-full max-w-lg flex items-center gap-2 group focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
             <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Search size={16} />
             </div>
             <input 
               type="text" 
               placeholder="Search area, landmark or house..." 
               className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder:text-gray-300"
               onKeyDown={async (e) => {
                 if (e.key === 'Enter') {
                   const query = e.target.value;
                   if (!query) return;
                   const toastId = toast.loading('Searching...');
                   try {
                     const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en`);
                     const results = await res.json();
                     if (results && results.length > 0) {
                       const { lat, lon } = results[0];
                       const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
                       setCurrentCoords(newCoords);
                       fetchAddress(newCoords);
                       toast.success('Location found!', { id: toastId });
                     } else {
                       toast.error('Location not found', { id: toastId });
                     }
                   } catch (err) {
                     toast.error('Search failed', { id: toastId });
                   }
                 }
               }}
             />
          </div>

          <div className="flex gap-2 pointer-events-auto w-full md:w-auto">
            <button 
              onClick={() => setShowSatellite(prev => !prev)}
              className="px-4 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-xl hover:bg-blue-50 transition-all border border-white/20 flex-1 md:flex-none justify-center"
            >
              {showSatellite ? 'Map' : 'Satellite'}
            </button>
            
            <button 
              onClick={handleConfirm}
              disabled={fetching}
              className="px-6 h-12 bg-blue-600 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex-[2] md:flex-none justify-center disabled:opacity-50"
            >
              Confirm <Check size={16} strokeWidth={3} />
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
          <LeafletMap 
            height="100%"
            userCoords={currentCoords}
            onUserLocationChange={(coords) => {
              setCurrentCoords(coords);
              fetchAddress(coords);
            }}
            onLocationSelect={(coords) => {
              setCurrentCoords(coords);
              fetchAddress(coords);
            }}
            markers={markers}
            showSatellite={showSatellite}
            zoom={19}
            autoDetect={!initialCoords}
          />
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!navigator.geolocation) return toast.error("Geolocation not supported");
              const tid = toast.loading("Detecting...");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  setCurrentCoords(newCoords);
                  fetchAddress(newCoords);
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

        {/* Editable Address Footer */}
        <div className="bg-white p-6 border-t border-gray-100 animate-in slide-in-from-bottom duration-500">
           <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 {fetching ? <Loader2 className="animate-spin" size={12} /> : <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                 {fetching ? 'Fetching Details...' : 'Refine Delivery Address'}
              </p>
              <div className="flex items-center gap-2">
                 <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Pin: {pincode || 'Detecting...'}</span>
              </div>
           </div>
           <textarea 
             value={address}
             onChange={(e) => setAddress(e.target.value)}
             placeholder="Click here to add area name (e.g. Krishnapark) or house details..."
             className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-blue-400 focus:bg-white outline-none transition-all resize-none h-20"
           />
           <p className="text-[8px] text-gray-400 mt-2 font-medium">TIP: You can manually type your area name above if the map detects it incorrectly.</p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLocationModal;
