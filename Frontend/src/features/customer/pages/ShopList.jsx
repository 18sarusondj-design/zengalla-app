import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { Store, MapPin, Map, Clock, ChevronRight, ChevronLeft, Search, Sparkles, ArrowRight, HelpCircle, ShoppingCart, SlidersHorizontal, ArrowUpDown, X, Check, Gift, Star } from 'lucide-react';
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


const FilterChip = ({ label, onClear }) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-100 text-sky-700 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm animate-in zoom-in duration-200">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-sky-200/50 transition-colors text-sky-500"
      >
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  );
};

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
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const { shops: contextShops, products, totalCartItemCount, fetchNearbyShops, fetchShops: fetchContextShops } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPincode, setCurrentPincode] = useState(() => {
    return localStorage.getItem('detected_pincode') || user?.pincode || '';
  });

  // --- Professional Filtering & Sorting States ---
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');
  const [filterRating, setFilterRating] = useState(0); 
  const [filterDeliveryTime, setFilterDeliveryTime] = useState('All'); 
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterSponsored, setFilterSponsored] = useState(false);
  const [filterDistance, setFilterDistance] = useState('All'); 
  const [filterMinOrder, setFilterMinOrder] = useState('All'); 
  const [filterHasOffers, setFilterHasOffers] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [pinFilterInput, setPinFilterInput] = useState('');

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
    const timer = setTimeout(() => {
      const reverseGeocode = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCoords.lat}&lon=${userCoords.lng}&addressdetails=1&accept-language=en`);
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
    }, 1000); // 1-second debounce to avoid Nominatim rate limits

    return () => clearTimeout(timer);
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
      const savedPin = localStorage.getItem('detected_pincode') || '';
      if (savedCoords) {
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
      setIsFallbackActive(false);
      if (shops.length === 0) setLoading(true);
      else setIsSearching(true);

      let data = [];
      let isFallback = false;
      
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

      // FALLBACK LOGIC: If no stores match current location or pincode, fetch all active shops
      if (!data || data.length === 0) {
        isFallback = true;
        try {
          if (query) {
            const res = await api.get(`/shops/nearby?search=${encodeURIComponent(query)}`);
            data = res.data?.shops || [];
          } else {
            const res = await api.get('/shops');
            data = res.data?.shops || [];
          }
        } catch (fallbackErr) {
          console.warn("Fallback fetch failed:", fallbackErr);
        }
      }

      setIsFallbackActive(isFallback);
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

  // Extract categories dynamically from the complete list of stores
  const categories = useMemo(() => {
    const list = new Set(shopsWithDistance.map(s => s.category).filter(Boolean));
    return ['All', ...Array.from(list)];
  }, [shopsWithDistance]);

  // Base list of stores determined by location rules
  const baseShops = useMemo(() => {
    const pin = currentPincode || user?.pincode || '';
    
    // Find sponsored shops in the user's location (matching pincode or within 10 km)
    const sponsoredInLocation = shopsWithDistance.filter(s => {
      if (!s.isSponsored) return false;
      const matchesPin = pin && s.pinCode === pin;
      const isClose = s.distance !== null && s.distance <= 10; // within 10 km
      return matchesPin || isClose;
    });

    if (sponsoredInLocation.length > 0) {
      return sponsoredInLocation;
    }
    
    return shopsWithDistance;
  }, [shopsWithDistance, currentPincode, user?.pincode]);

  // Apply e-commerce filters and sorting
  const filteredAndSortedShops = useMemo(() => {
    let result = [...baseShops];

    // 1. Shop Category Filter
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(s => s.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // 2. Rating Filter
    if (filterRating > 0) {
      result = result.filter(s => Number(s.dynamicRating || s.rating || 0) >= filterRating);
    }

    // 3. Delivery Time Filter
    if (filterDeliveryTime !== 'All') {
      const maxTime = Number(filterDeliveryTime);
      result = result.filter(s => {
        const estTime = s.hasHomeDelivery ? (15 + Math.round((s.distance || 0) * 4)) : 999;
        return estTime <= maxTime;
      });
    }

    // 4. Open Now Filter
    if (filterOpenNow) {
      result = result.filter(s => {
        if (s.isActive === false) return false;
        if (!s.operatingHours?.enabled) return true;
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        const [sH, sM] = (s.operatingHours.start || '00:00').split(':').map(Number);
        const [eH, eM] = (s.operatingHours.end || '23:59').split(':').map(Number);
        return current >= (sH * 60 + sM) && current <= (eH * 60 + eM);
      });
    }

    // 5. Sponsored Filter
    if (filterSponsored) {
      const pin = currentPincode || user?.pincode || '';
      result = result.filter(s => {
        const matchesPin = pin && s.pinCode === pin;
        const isClose = s.distance !== null && s.distance <= 10;
        return s.isSponsored && (matchesPin || isClose);
      });
    }

    // 6. Distance Filter
    if (filterDistance !== 'All') {
      const maxDist = Number(filterDistance);
      result = result.filter(s => s.distance !== null && s.distance !== undefined && s.distance <= maxDist);
    }

    // 7. Minimum Order Filter
    if (filterMinOrder !== 'All') {
      const maxMinOrder = Number(filterMinOrder);
      result = result.filter(s => {
        const minOrder = s.freeDeliveryThreshold ? Math.round(s.freeDeliveryThreshold / 5) : 0;
        return minOrder <= maxMinOrder;
      });
    }

    // 8. Offers/Discounts Filter
    if (filterHasOffers) {
      result = result.filter(s => {
        const hasCoupons = s.coupons && s.coupons.some(c => c.isActive && (!c.expiryDate || new Date(c.expiryDate) > new Date()));
        return !!s.promoBanner || hasCoupons;
      });
    }

    // 9. PIN Code Filter
    if (pinFilterInput && pinFilterInput.length === 6) {
      result = result.filter(s => s.pinCode === pinFilterInput);
    }

    // --- SORTING ---
    const pinToCompare = currentPincode || user?.pincode || '';
    
    if (sortBy === 'recommended') {
      result.sort((a, b) => {
        const aMatchesPin = a.pinCode === pinToCompare;
        const bMatchesPin = b.pinCode === pinToCompare;

        if (aMatchesPin && a.isSponsored && !(bMatchesPin && b.isSponsored)) return -1;
        if (bMatchesPin && b.isSponsored && !(aMatchesPin && a.isSponsored)) return 1;
        if (aMatchesPin && a.isSponsored && bMatchesPin && b.isSponsored) {
          const priorityA = a.sponsorshipPriority || 9999;
          const priorityB = b.sponsorshipPriority || 9999;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        if (aMatchesPin && !bMatchesPin) return -1;
        if (bMatchesPin && !aMatchesPin) return 1;

        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        if (a.isSponsored && b.isSponsored) {
          const priorityA = a.sponsorshipPriority || 9999;
          const priorityB = b.sponsorshipPriority || 9999;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        const ratingA = Number(a.dynamicRating || a.rating || 0);
        const ratingB = Number(b.dynamicRating || b.rating || 0);
        if (ratingB !== ratingA) return ratingB - ratingA;

        if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return (a._id || a.id).toString().localeCompare((b._id || b.id).toString());
      });
    } else if (sortBy === 'sponsored') {
      result.sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        return (a.sponsorshipPriority || 9999) - (b.sponsorshipPriority || 9999);
      });
    } else if (sortBy === 'nearest') {
      result.sort((a, b) => {
        if (a.distance === null || a.distance === undefined) return 1;
        if (b.distance === null || b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === 'rating') {
      result.sort((a, b) => {
        const ratingA = Number(a.dynamicRating || a.rating || 0);
        const ratingB = Number(b.dynamicRating || b.rating || 0);
        return ratingB - ratingA;
      });
    } else if (sortBy === 'delivery') {
      result.sort((a, b) => {
        const timeA = a.hasHomeDelivery ? (15 + Math.round((a.distance || 0) * 4)) : 999;
        const timeB = b.hasHomeDelivery ? (15 + Math.round((b.distance || 0) * 4)) : 999;
        return timeA - timeB;
      });
    } else if (sortBy === 'popularity') {
      result.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [
    baseShops,
    selectedCategory,
    sortBy,
    filterRating,
    filterDeliveryTime,
    filterOpenNow,
    filterSponsored,
    filterDistance,
    filterMinOrder,
    filterHasOffers,
    pinFilterInput,
    currentPincode,
    user?.pincode
  ]);

  const regularShops = filteredAndSortedShops;

  const handleClearAllFilters = () => {
    setSelectedCategory('All');
    setFilterRating(0);
    setFilterDeliveryTime('All');
    setFilterOpenNow(false);
    setFilterSponsored(false);
    setFilterDistance('All');
    setFilterMinOrder('All');
    setFilterHasOffers(false);
    setPinFilterInput('');
    setSortBy('recommended');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (filterRating > 0) count++;
    if (filterDeliveryTime !== 'All') count++;
    if (filterOpenNow) count++;
    if (filterSponsored) count++;
    if (filterDistance !== 'All') count++;
    if (filterMinOrder !== 'All') count++;
    if (filterHasOffers) count++;
    if (pinFilterInput && pinFilterInput.length === 6) count++;
    if (sortBy !== 'recommended') count++;
    return count;
  }, [selectedCategory, filterRating, filterDeliveryTime, filterOpenNow, filterSponsored, filterDistance, filterMinOrder, filterHasOffers, pinFilterInput, sortBy]);
  
  const totalPages = Math.ceil(regularShops.length / ITEMS_PER_PAGE);
  const paginatedShops = regularShops.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredShops = regularShops; // Keep this for the empty state check below

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
            onClick={() => {
              handleGetLocation();
              setIsMapOpen(true);
            }}
            className="w-14 h-14 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0"
            title="Use My Location"
          >
            <MapPin size={22} strokeWidth={2.5} />
          </button>
        </form>

        {/* --- E-commerce Filter & Sort Sticky Bar --- */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 border ${
                    isActive 
                      ? 'bg-white text-sky-900 border-white shadow-md' 
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Quick Sort & Advanced Filters Drawer Button */}
          <div className="flex items-center justify-between gap-3">
            {/* Quick Sort Dropdown */}
            <div className="relative flex-1 max-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/60 pointer-events-none">
                <ArrowUpDown size={12} strokeWidth={2.5} />
              </div>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 rounded-xl text-[10px] font-black text-white uppercase tracking-widest outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="recommended" className="text-gray-900">Sort: Recommended</option>
                <option value="sponsored" className="text-gray-900">Sort: Sponsored First</option>
                <option value="nearest" className="text-gray-900">Sort: Nearest First</option>
                <option value="rating" className="text-gray-900">Sort: Highest Rated</option>
                <option value="delivery" className="text-gray-900">Sort: Fastest Delivery</option>
                <option value="popularity" className="text-gray-900">Sort: Most Popular</option>
                <option value="newest" className="text-gray-900">Sort: Newest Shops</option>
              </select>
            </div>

            {/* Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${
                activeFiltersCount > 0
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                  : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal size={12} strokeWidth={2.5} />
              <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="pb-4">
        
        {!userCoords ? (
          <div className="mx-5 mt-4 p-5 bg-sky-50 border border-sky-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100/80 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-sky-950 uppercase tracking-tight">Location is not set</p>
                <p className="text-[10px] font-bold text-sky-600/80 mt-0.5">Please pin your location on the map to see stores near you.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 shadow-sm flex items-center gap-1.5"
              >
                <Map size={14} /> Pin Location on Map
              </button>
              <button
                type="button"
                onClick={handleGetLocation}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 shadow-sm"
              >
                Locate Me
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-5 mt-4 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                Active Location: {currentPincode ? `PIN Code ${currentPincode}` : `GPS (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`}
              </span>
            </div>
            <button 
              type="button"
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


        {/* --- Active Filter Chips Row --- */}
        {activeFiltersCount > 0 && (
          <div className="mx-5 mt-4 flex flex-wrap items-center gap-2 animate-in fade-in duration-300">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">Active:</span>
            
            {selectedCategory !== 'All' && (
              <FilterChip label={`Category: ${selectedCategory}`} onClear={() => { setSelectedCategory('All'); setCurrentPage(1); }} />
            )}
            {sortBy !== 'recommended' && (
              <FilterChip label={`Sort: ${sortBy}`} onClear={() => { setSortBy('recommended'); setCurrentPage(1); }} />
            )}
            {filterRating > 0 && (
              <FilterChip label={`Rating: ${filterRating}★+`} onClear={() => setFilterRating(0)} />
            )}
            {filterDeliveryTime !== 'All' && (
              <FilterChip label={`Delivery: <${filterDeliveryTime} mins`} onClear={() => setFilterDeliveryTime('All')} />
            )}
            {filterOpenNow && (
              <FilterChip label="Open Now" onClear={() => setFilterOpenNow(false)} />
            )}
            {filterSponsored && (
              <FilterChip label="Sponsored Only" onClear={() => setFilterSponsored(false)} />
            )}
            {filterDistance !== 'All' && (
              <FilterChip label={`Distance: <${filterDistance} km`} onClear={() => setFilterDistance('All')} />
            )}
            {filterMinOrder !== 'All' && (
              <FilterChip label={`Min Order: <₹${filterMinOrder}`} onClear={() => setFilterMinOrder('All')} />
            )}
            {filterHasOffers && (
              <FilterChip label="Offers Available" onClear={() => setFilterHasOffers(false)} />
            )}
            {pinFilterInput && pinFilterInput.length === 6 && (
              <FilterChip label={`PIN: ${pinFilterInput}`} onClear={() => setPinFilterInput('')} />
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest transition-colors ml-auto active:scale-95"
            >
              Clear All
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

          {loading || isSearching ? (
            <div className="space-y-6 max-w-[1400px] mx-auto w-full">
              {/* Pulsating premium title */}
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-sky-500 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="relative w-16 h-16 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
                    <Search className="w-8 h-8 animate-pulse" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-gray-800 tracking-tight animate-pulse">Finding stores near you...</h3>
                  <p className="text-xs text-gray-500 font-medium">Scanning local partners and checking coverage</p>
                </div>
              </div>

              {/* Skeleton cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-3xl p-5 space-y-4 shadow-sm animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-2xl shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
                        <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="h-3 bg-gray-200 rounded-lg w-full" />
                      <div className="h-3 bg-gray-200 rounded-lg w-5/6" />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="h-4 bg-gray-200 rounded-lg w-1/4" />
                      <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <Search className="w-16 h-16 text-gray-100" strokeWidth={1} />
              <p className="text-gray-400 font-bold italic tracking-wide">No shops found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10 w-full">
              {isFallbackActive && (
                <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex flex-col sm:flex-row items-center gap-4 shadow-sm animate-in fade-in duration-300 animate-pulse">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-600 animate-spin" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="text-sm font-black text-amber-950 uppercase tracking-tight">No Stores Near You</h4>
                    <p className="text-xs font-bold text-amber-700/90 mt-0.5">
                      We couldn't find any stores near your location ({currentPincode || 'detected location'}). Showing all available stores in our network below.
                    </p>
                  </div>
                </div>
              )}
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

      {/* Advanced Filters Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl z-10 flex flex-col animate-scale-in">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-sky-900 text-white">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} strokeWidth={2.5} />
                <h3 className="text-sm font-black uppercase tracking-wider">Advanced Filters</h3>
                {activeFiltersCount > 0 && (
                  <span className="bg-sky-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button 
                    type="button"
                    onClick={handleClearAllFilters}
                    className="text-[10px] font-bold uppercase tracking-wider text-sky-200 hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all text-white"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar-visible">
              {/* Category Filter */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shop Category</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          isActive 
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Code Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PIN Code Filter</h4>
                  {pinFilterInput && (
                    <button 
                      type="button" 
                      onClick={() => setPinFilterInput('')}
                      className="text-[9px] font-black text-rose-600 uppercase tracking-widest"
                    >
                      Clear PIN
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code..."
                    value={pinFilterInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                      setPinFilterInput(val);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <MapPin size={14} />
                  </div>
                </div>
                {pinFilterInput && pinFilterInput.length < 6 && (
                  <p className="text-[9px] font-bold text-amber-600">Enter a complete 6-digit PIN code to apply filter</p>
                )}
              </div>

              {/* Distance Filter */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Distance</h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: 'Any', value: 'All' },
                    { label: '2 km', value: '2' },
                    { label: '5 km', value: '5' },
                    { label: '10 km', value: '10' },
                    { label: '20 km', value: '20' }
                  ].map((opt) => {
                    const isActive = filterDistance === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilterDistance(opt.value)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition-all ${
                          isActive 
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minimum Rating Filter */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minimum Rating</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'All', value: 0 },
                    { label: '3.5★+', value: 3.5 },
                    { label: '4.0★+', value: 4.0 },
                    { label: '4.5★+', value: 4.5 }
                  ].map((opt) => {
                    const isActive = Number(filterRating) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilterRating(opt.value)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition-all ${
                          isActive 
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Time Filter */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Time</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Any', value: 'All' },
                    { label: '<30m', value: '30' },
                    { label: '<45m', value: '45' },
                    { label: '<60m', value: '60' }
                  ].map((opt) => {
                    const isActive = filterDeliveryTime === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilterDeliveryTime(opt.value)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition-all ${
                          isActive 
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minimum Order Filter */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minimum Order</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Any', value: 'All' },
                    { label: '<₹100', value: '100' },
                    { label: '<₹200', value: '200' },
                    { label: '<₹300', value: '300' }
                  ].map((opt) => {
                    const isActive = filterMinOrder === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilterMinOrder(opt.value)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition-all ${
                          isActive 
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Store Toggles</h4>
                
                {/* Open Now Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <div>
                      <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Open Now Only</p>
                      <p className="text-[9px] font-bold text-gray-400">Show stores currently operating</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterOpenNow(!filterOpenNow)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      filterOpenNow ? 'bg-sky-600' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        filterOpenNow ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Sponsored Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-gray-400" />
                    <div>
                      <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Sponsored Stores Only</p>
                      <p className="text-[9px] font-bold text-gray-400">Show verified premium sponsors</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterSponsored(!filterSponsored)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      filterSponsored ? 'bg-sky-600' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        filterSponsored ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Offers/Discounts Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift size={14} className="text-gray-400" />
                    <div>
                      <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Offers & Discounts</p>
                      <p className="text-[9px] font-bold text-gray-400">Show stores with active promo codes</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterHasOffers(!filterHasOffers)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      filterHasOffers ? 'bg-sky-600' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        filterHasOffers ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopList;
