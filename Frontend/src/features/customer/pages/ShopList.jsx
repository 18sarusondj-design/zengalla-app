import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { Store, MapPin, Map, Clock, ChevronRight, ChevronLeft, Search, Sparkles, ArrowRight, HelpCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import ShopMapModal from '../components/ShopMapModal';
import FeaturedCarousel from '../components/FeaturedCarousel';
import FullScreenLoader from '../components/FullScreenLoader';
import Logo from '../../common/components/Logo';
import { ShopCard } from '../components/ShopCard';
import SEO from '../../common/components/SEO';
import api from '../../../config/api.js';


const ShopList = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useQueryParam('search', '');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const [userCoords, setUserCoords] = useState(() => {
    try {
      const saved = localStorage.getItem('detected_coords');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [shopsWithDistance, setShopsWithDistance] = useState([]);
  const [topSponsoredShops, setTopSponsoredShops] = useState([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { shops: contextShops, products, totalCartItemCount, fetchNearbyShops, fetchShops: fetchContextShops } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPincode, setCurrentPincode] = useState(() => {
    return localStorage.getItem('detected_pincode') || user?.pincode || '';
  });

  const geocodePincode = async (pin) => {
    if (!pin || pin.length !== 6) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${pin}&country=India`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          setUserCoords(coords);
          localStorage.setItem('detected_coords', JSON.stringify(coords));
        }
      }
    } catch (err) {
      console.warn("Pincode geocoding failed:", err.message);
    }
  };

  useEffect(() => {
    if (user?.pincode) {
      setCurrentPincode(user.pincode);
      localStorage.setItem('detected_pincode', user.pincode);
      if (!user?.location?.coordinates) {
        geocodePincode(user.pincode);
      }
    }
  }, [user?.pincode, user?.location?.coordinates]);

  useEffect(() => {
    if (!userCoords) return;
    const reverseGeocode = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCoords.lat}&lon=${userCoords.lng}&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const postcode = data.address.postcode;
            const pin = postcode ? postcode.split(' ')[0].replace(/\D/g, '').substring(0, 6) : null;
            if (pin && pin.length === 6) {
              setCurrentPincode(pin);
              localStorage.setItem('detected_pincode', pin);
            }
          }
        }
      } catch (err) {
        console.warn("Reverse geocoding failed on user location:", err.message);
      }
    };
    reverseGeocode();
  }, [userCoords]);

  const detectLocation = () => {
    // Priority 1: User's saved profile location
    if (user?.location?.coordinates) {
      const coords = {
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0]
      };
      setUserCoords(coords);
      localStorage.setItem('detected_coords', JSON.stringify(coords));
      return;
    }

    // Priority 2: Use cached location from localStorage if available
    try {
      const savedCoords = localStorage.getItem('detected_coords');
      const savedPin = localStorage.getItem('detected_pincode');
      if (savedCoords && savedPin) {
        setUserCoords(JSON.parse(savedCoords));
        setCurrentPincode(savedPin);
        return;
      }
    } catch (e) {
      console.warn("Error reading from localStorage:", e);
    }

    // Priority 3: Browser Geolocation
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserCoords(coords);
        localStorage.setItem('detected_coords', JSON.stringify(coords));
        setDetectingLocation(false);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectLocation();
    fetchContextShops(); // Pre-fetch baseline shops
  }, [fetchContextShops, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShops(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, userCoords, currentPincode]); // Re-fetch when location or PIN updates

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    const toastId = toast.loading("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserCoords(coords);
        localStorage.setItem('detected_coords', JSON.stringify(coords));
        toast.dismiss(toastId);
        toast.success("Location updated! Finding stores near you.");
      },
      (error) => {
        toast.dismiss(toastId);
        let msg = "Failed to get location";
        if (error.code === 1) msg = "Location permission denied";
        else if (error.code === 2) msg = "Location unavailable";
        else if (error.code === 3) msg = "Location request timed out";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const fetchShops = async (query = '') => {
    try {
      if (shops.length === 0) setLoading(true);
      else setIsSearching(true);

      let data = [];
      
      // Try to fetch nearby shops if coords available
      if (userCoords) {
        try {
          // Use a massive radius (10000km) to show ALL shops sorted by distance
          data = await fetchNearbyShops(userCoords.lat, userCoords.lng, 10000, query, currentPincode); 
          if (!data || data.length === 0) {
            const res = await api.get(`/shops?pinCode=${currentPincode}`);
            data = res.data?.shops || [];
          }
        } catch (err) {
          console.warn("Nearby fetch failed, using fallback:", err);
          const res = await api.get(`/shops?pinCode=${currentPincode}`);
          data = res.data?.shops || [];
        }
      } else {
        try {
          const res = await api.get(`/shops?pinCode=${currentPincode}`);
          data = res.data?.shops || [];
          if (query && data) {
            data = data.filter(s => 
              s.name.toLowerCase().includes(query.toLowerCase()) || 
              s.category?.toLowerCase().includes(query.toLowerCase())
            );
          }
        } catch (err) {
          data = [];
        }
      }

      setShops(data || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchShops(searchTerm, true);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  useEffect(() => {
    if (shops.length >= 0) {
      const enriched = shops.map(shop => {
        const shopId = (shop._id || shop.id).toString();
        // 📊 Calculate average rating based on all products in this shop
        const shopProducts = products.filter(p => {
          const pShopId = (p.shopId?._id || p.shopId || p.shop_id?._id || p.shop_id || '').toString();
          return pShopId === shopId;
        });
        
        const totalRating = shopProducts.reduce((sum, p) => sum + (Number(p.rating) || 0), 0);
        const avgRating = shopProducts.length > 0 ? (totalRating / shopProducts.length).toFixed(1) : (shop.rating || 0);
        const ratingCount = shopProducts.length;

        return {
          ...shop,
          dynamicRating: avgRating,
          ratingCount: ratingCount,
          distance: shop.distance ?? calculateDistance(
            Number(userCoords?.lat),
            Number(userCoords?.lng),
            shop.location?.coordinates?.[1],
            shop.location?.coordinates?.[0]
          )
        };
      });

      enriched.sort((a, b) => {
        const pinToCompare = currentPincode || user?.pincode || '';
        const aMatchesPin = a.pinCode === pinToCompare;
        const bMatchesPin = b.pinCode === pinToCompare;

        // 1. Prioritize Sponsored Shops in the user's Pincode, sorted by priority (ascending)
        if (aMatchesPin && a.isSponsored && !(bMatchesPin && b.isSponsored)) return -1;
        if (bMatchesPin && b.isSponsored && !(aMatchesPin && a.isSponsored)) return 1;
        if (aMatchesPin && a.isSponsored && bMatchesPin && b.isSponsored) {
          const priorityA = a.sponsorshipPriority || 9999;
          const priorityB = b.sponsorshipPriority || 9999;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        // 2. Prioritize Shops in the user's Pincode (even if not sponsored)
        if (aMatchesPin && !bMatchesPin) return -1;
        if (bMatchesPin && !aMatchesPin) return 1;

        // 3. Sponsored first (for other locations)
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        if (a.isSponsored && b.isSponsored) {
          const priorityA = a.sponsorshipPriority || 9999;
          const priorityB = b.sponsorshipPriority || 9999;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }
        
        // 4. Best Rating next
        const ratingA = Number(a.dynamicRating) || 0;
        const ratingB = Number(b.dynamicRating) || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;

        // 5. Distance (Proximity)
        if (userCoords) {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          if (a.distance !== b.distance) return a.distance - b.distance;
        }
        return (a._id || a.id).toString().localeCompare((b._id || b.id).toString());
      });
      setShopsWithDistance(enriched);
    }
  }, [shops, userCoords]);

  const fetchTopSponsoredShops = async () => {
    try {
      const pin = currentPincode || user?.pincode || '';
      const { data } = await api.get(`/shops?isSponsored=true&limit=5&pinCode=${pin}`);
      setTopSponsoredShops(data.shops || []);
    } catch (err) {
      console.error("Failed to fetch sponsored shops:", err);
    }
  };

  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      fetchTopSponsoredShops();
    }
  }, [userCoords, currentPincode]);

  const pinToCompare = currentPincode || user?.pincode || '';
  const featuredShops = shopsWithDistance
    .filter(s => s.isSponsored)
    .sort((a, b) => {
      const aMatches = a.pinCode === pinToCompare;
      const bMatches = b.pinCode === pinToCompare;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      if (aMatches && bMatches) {
        return (a.sponsorshipPriority || 9999) - (b.sponsorshipPriority || 9999);
      }
      return 0;
    });

  // Regular shops should show everything to maintain UI stability
  const regularShops = shopsWithDistance;
  
  const totalPages = Math.ceil(regularShops.length / ITEMS_PER_PAGE);
  const paginatedShops = regularShops.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredShops = shopsWithDistance; // Keep this for the empty state check below

  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Only show full screen loader on VERY first load when we have NOTHING
  if (loading && shops.length === 0 && contextShops.length === 0) {
    return <FullScreenLoader message="Scanning for nearby stores..." />;
  }

  return (
    <div className="min-h-full bg-gray-50 font-sans">
      <SEO 
        title="Discover Shops" 
        description="Browse premium local grocery stores and marketplaces near you. Find fresh produce, household essentials, and more."
        canonical="/shops"
      />


      {/* ── Premium Hero Header (Sticky) ── */}
      <div className="sticky top-0 z-[100] overflow-hidden shrink-0 shadow-lg border-b border-white/10" style={{background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)'}}>

        {/* Nav Row */}
        <div className="relative px-5 pt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo className="h-10" variant="full" white />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cart')}
              aria-label="View shopping cart"
              className="relative w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10"
            >

              <ShoppingCart size={20} />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                  {Math.floor(totalCartItemCount)}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/')}
              aria-label="Go back to home"
              className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10"
            >

              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar & Location Button */}
        <form onSubmit={handleSearchSubmit} className="relative px-5 pt-6 pb-8 flex gap-2">
          <div className="relative group flex-1">
            <button 
              type="submit"
              className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-sky-500 transition-colors z-10 hover:text-sky-400"
              disabled={isSearching}
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={18} strokeWidth={3} />
              )}
            </button>
            <label htmlFor="shop-search" className="sr-only">Search stores</label>
            <input
              id="shop-search"
              type="text"
              placeholder="Search stores nearby..."
              className="block w-full pl-11 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-white/30 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="w-14 h-14 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0"
            title="Select Location on Map"
          >
            <Map size={22} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={handleGetLocation}
            className="w-14 h-14 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0"
            title="Use My Location"
          >
            <MapPin size={22} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="pb-4">
        
        {!currentPincode ? (
          <div className="mx-5 mt-4 p-5 bg-sky-50 border border-sky-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100/80 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-sky-950 uppercase tracking-tight">Location access is off</p>
                <p className="text-[10px] font-bold text-sky-600/80 mt-0.5">Enter your pincode or enable location to see sponsored local stores near you.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit PIN"
                className="w-full md:w-36 px-4 py-2.5 rounded-xl border-2 border-sky-200/50 bg-white text-xs font-bold text-gray-800 placeholder:text-gray-400 outline-none focus:border-sky-500 transition-all"
                onChange={async (e) => {
                  const pin = e.target.value.replace(/\D/g, '');
                  if (pin.length === 6) {
                    setCurrentPincode(pin);
                    localStorage.setItem('detected_pincode', pin);
                    
                    const toastId = toast.loading(`Locating PIN ${pin}...`);
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${pin}&country=India`);
                      if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                          setUserCoords(coords);
                          localStorage.setItem('detected_coords', JSON.stringify(coords));
                          toast.success(`Showing stores near PIN: ${pin}`, { id: toastId });
                        } else {
                          toast.error(`Could not resolve coordinates for PIN ${pin}`, { id: toastId });
                        }
                      } else {
                        toast.error(`PIN search failed`, { id: toastId });
                      }
                    } catch (err) {
                      console.warn("Geocoding pincode failed:", err.message);
                      toast.error(`PIN search failed`, { id: toastId });
                    }
                  }
                }}
              />
              <button
                onClick={handleGetLocation}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 shadow-sm"
              >
                Locate Me
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-5 mt-4 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active PIN Code: {currentPincode}</span>
            </div>
            <button 
              onClick={() => {
                setCurrentPincode('');
                localStorage.removeItem('detected_pincode');
                localStorage.removeItem('detected_coords');
                setUserCoords(null);
              }} 
              className="text-[9px] font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest transition-colors"
            >
              Change Location
            </button>
          </div>
        )}

        {/* ════ FEATURED / AD CAROUSEL ════ */}
        {!searchTerm && (
          <FeaturedCarousel 
            featuredShops={featuredShops} 
            navigate={navigate} 
          />
        )}


        {/* ════ ALL SHOPS LIST ════ */}
        <div className="px-5 py-6 space-y-6">
          {/* Section header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {searchTerm ? `Results for "${searchTerm}"` : 'All Stores'}
            </h2>
            <div className="flex items-center gap-2">
              {detectingLocation && (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg animate-pulse">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Detecting...</span>
                </div>
              )}
              {userCoords && !detectingLocation && (
                <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Location On</span>
                </div>
              )}
            </div>
          </div>

          {filteredShops.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <Search className="w-16 h-16 text-gray-100" strokeWidth={1} />
              <p className="text-gray-400 font-bold italic tracking-wide">No shops found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10 w-full">
              
              {regularShops.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1400px] mx-auto w-full">
                    {paginatedShops.map((shop, index) => (
                      <ShopCard key={shop?._id || index} shop={shop} index={index} searchTerm={searchTerm} navigate={navigate} />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-2 pb-10">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => {
                           setCurrentPage(prev => Math.max(1, prev - 1));
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-sky-600 disabled:opacity-30 transition-all shadow-sm"
                      >
                        <ChevronLeft size={18} strokeWidth={3} />
                      </button>
                      
                      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm">
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentPage(i + 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`min-w-[2.5rem] h-10 px-2 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-sky-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => {
                          setCurrentPage(prev => Math.min(totalPages, prev + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-sky-600 disabled:opacity-30 transition-all shadow-sm"
                      >
                        <ChevronRight size={18} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* End of list */}
        </div>
      </div>

      {/* Map Modal */}
      <ShopMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        shops={contextShops}
        userCoords={userCoords}
        onUserLocationChange={(coords) => {
          setUserCoords(coords);
          localStorage.setItem('detected_coords', JSON.stringify(coords));
        }}
      />
    </div>
  );
};

export default ShopList;
