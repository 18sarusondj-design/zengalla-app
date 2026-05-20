import React, { useState, useEffect } from 'react';
import { X, Navigation, Store, ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../common/components/Logo';
import L from 'leaflet';
import api from '../../../config/api.js';
import { toast } from 'sonner';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 15.3647,
  lng: 75.1240
};

import LeafletMap from '../../common/components/LeafletMap';

const ShopMapModal = ({ isOpen, onClose, shops: propShops, userCoords, onUserLocationChange }) => {
  const navigate = useNavigate();
  const [showSatellite, setShowSatellite] = useState(false);
  const [allShops, setAllShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadAllShops = async () => {
        setLoading(true);
        try {
          const res = await api.get('/shops');
          setAllShops(res.data?.shops || []);
        } catch (err) {
          console.error("Failed to load shops for map:", err);
          setAllShops(propShops || []);
        } finally {
          setLoading(false);
        }
      };
      loadAllShops();
    }
  }, [isOpen, propShops]);

  const handleCitySearch = async (e) => {
    if (e) e.preventDefault();
    if (!cityQuery.trim()) return;

    setSearchingCity(true);
    const toastId = toast.loading(`Searching for "${cityQuery}"...`);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const newCoords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          onUserLocationChange(newCoords);
          toast.success(`Centered map on: ${data[0].display_name}`, { id: toastId });
        } else {
          toast.error("Location not found", { id: toastId });
        }
      } else {
        toast.error("Search request failed", { id: toastId });
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
      toast.error("Error connecting to search service", { id: toastId });
    } finally {
      setSearchingCity(false);
    }
  };

  if (!isOpen) return null;

  const markers = allShops?.filter(s => s.isActive && Array.isArray(s.location?.coordinates)).map(shop => {
    const lat = Number(shop.location.coordinates[1]);
    const lng = Number(shop.location.coordinates[0]);

    // Create a beautiful, custom HTML divIcon for the vendor marker
    const shopIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center select-none" style="transform: translate(0px, 0px);">
          <!-- Glowing background pulse -->
          <div class="absolute w-12 h-12 bg-sky-500/35 rounded-full animate-ping" style="animation-duration: 3s;"></div>
          
          <!-- Outer glowing circle -->
          <div class="relative flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-full border-2 border-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-200">
            <div class="w-7 h-7 rounded-full overflow-hidden bg-white flex items-center justify-center">
              ${shop.imageUrl ? `
                <img src="${shop.imageUrl}" class="w-full h-full object-cover" alt="" />
              ` : `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 17H2"/></svg>
              `}
            </div>
          </div>
          <!-- Little arrow pointing down -->
          <div class="absolute -bottom-1.5 w-3 h-3 bg-gradient-to-br from-blue-600 to-blue-700 rotate-45 border-r border-b border-white z-[-1]"></div>
        </div>
      `,
      className: 'custom-shop-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -38]
    });

    return {
      lat,
      lng,
      icon: shopIcon,
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
    };
  }) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:max-w-6xl md:h-[85vh] md:rounded-[48px] overflow-hidden flex flex-col shadow-2xl relative border border-white/20">
        
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4 pointer-events-auto shrink-0 w-full md:w-auto">
            <Logo variant="icon" className="w-10 h-10 rounded-2xl shadow-lg transform rotate-3" />
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tighter uppercase leading-none">Nearby Stores</h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Live Vendor Map • Karnataka</p>
            </div>
          </div>

          {/* Floating Search Bar */}
          <div className="pointer-events-auto w-full max-w-sm px-4 md:px-0">
            <form 
              onSubmit={handleCitySearch}
              className="bg-white/90 backdrop-blur-md p-2 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-2 w-full"
            >
              <div className="flex items-center gap-2 px-3 py-1 flex-1 min-w-0">
                <Search className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="Search city, area or PIN code..."
                  className="w-full text-xs font-bold text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchingCity}
                className="h-10 px-4 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                {searchingCity ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : 'Locate'}
              </button>
            </form>
          </div>

          <div className="flex gap-2 pointer-events-auto shrink-0 w-full md:w-auto justify-end">
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
            zoom={13}
          />
          
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
           {loading ? (
             <>
               <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
               <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Loading Vendors...</span>
             </>
           ) : (
             <>
               <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
               <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{markers.length} Active Vendors Found</span>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default ShopMapModal;
