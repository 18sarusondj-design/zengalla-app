import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { Store, MapPin, ChevronLeft, ChevronRight, ShoppingBag, Plus, Minus, Loader2, ArrowRight, Search, X, Info, Gift, Bell, Copy, Check, Phone, Clock, Eye, ShoppingCart, Trash2, Sparkles, Ticket, Star, SlidersHorizontal, CalendarX } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import FullScreenLoader from '../components/FullScreenLoader';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CustomerWeightModal from '../components/CustomerWeightModal';
import Logo from '../../common/components/Logo';
import ReviewStars from '../components/ReviewStars';
import PromoModal from '../components/PromoModal';
import SEO from '../../common/components/SEO';
import { ProductSkeleton } from '../components/Skeleton';


// Product Ratings & Reviews Integration

const getProductBrand = (p) => {
  if (!p || !p.name) return 'Generic';
  const firstWord = p.name.trim().split(/\s+/)[0];
  const cleaned = firstWord.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned || 'Generic';
};

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

const ShopMenu = () => {
  const isShopOpen = (s) => {
    if (!s) return false;
    if (s.isActive === false) return false;

    // Check holidays
    if (s.holidays?.length > 0) {
      const today = new Date();
      const isHoliday = s.holidays.some(h => {
        const start = new Date(h.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(h.endDate);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
      });
      if (isHoliday) return false;
    }

    if (!s.operatingHours?.enabled) return true;
    
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = (s.operatingHours.start || '00:00').split(':').map(Number);
    const [eH, eM] = (s.operatingHours.end || '23:59').split(':').map(Number);
    return current >= (sH * 60 + sM) && current <= (eH * 60 + eM);
  };

  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useQueryParam('search', '');
  const [activeCategory, setActiveCategory] = useQueryParam('category', 'All');
  const [coupons, setCoupons] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [sortOrder, setSortOrder] = useState('alpha'); // 'relevant' for personalization, 'alpha' for showing all
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weighingProduct, setWeighingProduct] = useState(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

  // -- Advanced Product Filters & Sort States --
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceMinFilter, setPriceMinFilter] = useState('');
  const [priceMaxFilter, setPriceMaxFilter] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);
  const [bestSellersOnly, setBestSellersOnly] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { cart: allCarts, addToCart, removeFromCart, updateQuantity, setItemQuantity, cartTotal, orders, deleteProduct, deleteCategory, setCurrentShopId, customerGstin } = useStore();
  const cart = allCarts[shopId] || [];
  const { user } = useAuth();

  // -- Promotional Banners State --
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isOwner = user?.role === 'vendor' && user?.email === shop?.vendorEmail;

  useEffect(() => {
    if (location.state?.orderSuccess) {
      setShowSuccess(true);
      // Automatically clear state to prevent banner on manual refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const fetchShopBanners = async () => {
    try {
      const { data } = await api.get(`/banners/shop/${shopId}`);
      if (data?.success) {
        setBanners(data.banners || []);
      }
    } catch (err) {
      console.debug("Failed to fetch banners:", err.message);
    }
  };

  useEffect(() => {
    fetchShopProducts();
    fetchShopCoupons();
    fetchShopBanners();
  }, [shopId]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners]);

  useEffect(() => {
    if (shopId) {
      setCurrentShopId(shopId);
      // Track visited shop
      try {
        const visited = JSON.parse(localStorage.getItem('visitedShops') || '[]');
        const newVisited = [shopId, ...visited.filter(id => id !== shopId)].slice(0, 20);
        localStorage.setItem('visitedShops', JSON.stringify(newVisited));
      } catch (e) { console.warn("Failed to save visited shop"); }
    }
  }, [shopId]);

  // 🔒 Lock background scroll when modal is open
  useEffect(() => {
    if (selectedProduct || isPromoModalOpen || weighingProduct || isFilterDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProduct, isPromoModalOpen, weighingProduct, isFilterDrawerOpen]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    
    // Calculate order frequency for products in this shop
    const shopOrders = (orders || []).filter(o => {
      const orderShopId = o.shopId?._id || o.shopId || o.shop?._id || o.shop;
      return String(orderShopId) === String(shopId);
    });

    const orderedProductCounts = {};
    shopOrders.forEach(o => {
      (o.items || []).forEach(i => {
        const pId = String(i.product?._id || i.product?.id || i.product);
        orderedProductCounts[pId] = (orderedProductCounts[pId] || 0) + 1;
      });
    });

    const filtered = products.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();

      // Search matching (partial, case-insensitive)
      const matchesSearch = pName.includes(query) || pDesc.includes(query) || pCat.includes(query);
      
      // Category Filter (both quick category and drawer selection)
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      
      // If 'For You' is active, only show items previously ordered
      if (sortOrder === 'relevant') {
        const pId = String(p._id || p.id);
        if (!orderedProductCounts[pId]) return false;
      }

      // Brand Filter
      const pBrand = getProductBrand(p);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(pBrand);

      // Price Range Filter
      const matchesMinPrice = priceMinFilter === '' || p.price >= Number(priceMinFilter);
      const matchesMaxPrice = priceMaxFilter === '' || p.price <= Number(priceMaxFilter);

      // Stock Filter
      const pStock = p.stockQuantity ?? p.stock ?? 0;
      const matchesStock = (!inStockOnly && !hideOutOfStock) || pStock > 0;

      // Discounted Products
      const matchesDiscount = !discountedOnly || (p.mrp > p.price);

      // New Arrivals (created within last 90 days)
      const isNewArrival = p.createdAt && (new Date() - new Date(p.createdAt) < 90 * 24 * 60 * 60 * 1000);
      const matchesNewArrivals = !newArrivalsOnly || isNewArrival;

      // Best Sellers
      const isBestSeller = (orderedProductCounts[String(p._id || p.id)] || 0) > 0 || (p.rating >= 4.0 && p.numReviews > 0);
      const matchesBestSellers = !bestSellersOnly || isBestSeller;

      return matchesSearch && matchesCategory && matchesBrand && matchesMinPrice && matchesMaxPrice && matchesStock && matchesDiscount && matchesNewArrivals && matchesBestSellers;
    }).sort((a, b) => {
      // Sold out products go to the bottom for all sorts, unless filtered out
      const aStock = a.stockQuantity ?? a.stock ?? 0;
      const bStock = b.stockQuantity ?? b.stock ?? 0;
      const aIsZero = (aStock === 0);
      const bIsZero = (bStock === 0);
      
      if (!aIsZero && bIsZero) return -1;
      if (aIsZero && !bIsZero) return 1;

      // Apply Sort Options
      if (sortBy === 'recommended') {
        // Rule 2: Top Rated (if sortOrder is 'top-rated')
        if (sortOrder === 'top-rated') {
          if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
          return (b.numReviews || 0) - (a.numReviews || 0);
        }

        // Rule 3: If 'For You' is selected, prioritize by order frequency and recency
        if (sortOrder === 'relevant') {
          const aId = String(a._id || a.id);
          const bId = String(b._id || b.id);
          const aCount = orderedProductCounts[aId] || 0;
          const bCount = orderedProductCounts[bId] || 0;
          
          // Priority 1: Use order frequency
          if (aCount !== bCount) return bCount - aCount; 
          
          // Priority 2: Recency bonus (if frequency is same, check if it was in the last order)
          if (shopOrders.length > 0) {
             const lastOrderItems = shopOrders[0].items || [];
             const aInLast = lastOrderItems.some(i => String(i.product?._id || i.product) === aId);
             const bInLast = lastOrderItems.some(i => String(i.product?._id || i.product) === bId);
             if (aInLast && !bInLast) return -1;
             if (!aInLast && bInLast) return 1;
          }
        }
        
        // Default / Tie-breaker: Alphabetical (A-Z)
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'priceAsc') {
        return a.price - b.price;
      } else if (sortBy === 'priceDesc') {
        return b.price - a.price;
      } else if (sortBy === 'newArrivals') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'bestSelling') {
        const aCount = orderedProductCounts[String(a._id || a.id)] || 0;
        const bCount = orderedProductCounts[String(b._id || b.id)] || 0;
        return bCount - aCount;
      } else if (sortBy === 'popularity') {
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.numReviews || 0) - (a.numReviews || 0);
      } else if (sortBy === 'highestDiscount') {
        const getDiscount = p => p.mrp > p.price ? ((p.mrp - p.price) / p.mrp) : 0;
        return getDiscount(b) - getDiscount(a);
      } else if (sortBy === 'aToZ') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'zToA') {
        return (b.name || '').localeCompare(a.name || '');
      }

      return 0;
    });

    setFilteredProducts(filtered);
  }, [
    searchQuery,
    products,
    activeCategory,
    sortOrder,
    sortBy,
    selectedBrands,
    priceMinFilter,
    priceMaxFilter,
    inStockOnly,
    hideOutOfStock,
    discountedOnly,
    newArrivalsOnly,
    bestSellersOnly,
    orders,
    shopId
  ]);

  // 🎯 Auto-scroll and Highlight searched item
  useEffect(() => {
    if (searchQuery && filteredProducts.length > 0) {
      const timer = setTimeout(() => {
        const targetProduct = filteredProducts.find(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (targetProduct) {
          const element = document.getElementById(`product-${targetProduct._id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-sky-500', 'ring-offset-2', 'animate-pulse', 'z-50');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-sky-500', 'ring-offset-2', 'animate-pulse', 'z-50');
            }, 3000);
          }
        }
      }, 500); // Wait for render
      return () => clearTimeout(timer);
    }
  }, [searchQuery, filteredProducts.length === products.length]); // Only run when products are loaded

  const hasOrderedItem = (pId) => {
    const shopOrders = (orders || []).filter(o => {
      const orderShopId = o.shopId?._id || o.shopId || o.shop?._id || o.shop;
      return String(orderShopId) === String(shopId);
    });
    const pIds = shopOrders.flatMap(o => (o.items || []).map(i => String(i.product?._id || i.product?.id || i.product)));
    return pIds.includes(String(pId));
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    activeCategory,
    sortOrder,
    sortBy,
    selectedBrands,
    priceMinFilter,
    priceMaxFilter,
    inStockOnly,
    hideOutOfStock,
    discountedOnly,
    newArrivalsOnly,
    bestSellersOnly
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const totalPages = Math.ceil((filteredProducts?.length || 0) / ITEMS_PER_PAGE);
  const paginatedProducts = (filteredProducts || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const categories = ['All', ...new Set((products || []).map(p => p.category).filter(Boolean))];
  const brands = useMemo(() => {
    const list = new Set((products || []).map(p => getProductBrand(p)).filter(Boolean));
    return Array.from(list).sort();
  }, [products]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (priceMinFilter !== '') count++;
    if (priceMaxFilter !== '') count++;
    if (inStockOnly) count++;
    if (hideOutOfStock) count++;
    if (discountedOnly) count++;
    if (newArrivalsOnly) count++;
    if (bestSellersOnly) count++;
    if (sortBy !== 'recommended') count++;
    return count;
  }, [selectedBrands, priceMinFilter, priceMaxFilter, inStockOnly, hideOutOfStock, discountedOnly, newArrivalsOnly, bestSellersOnly, sortBy]);

  const handleClearAllFilters = () => {
    setSelectedBrands([]);
    setPriceMinFilter('');
    setPriceMaxFilter('');
    setInStockOnly(false);
    setHideOutOfStock(false);
    setDiscountedOnly(false);
    setNewArrivalsOnly(false);
    setBestSellersOnly(false);
    setSortBy('recommended');
  };

  const renderFilterContent = () => {
    return (
      <div className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</h4>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setSortOrder(cat === 'All' ? 'alpha' : 'alpha');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    isActive 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand Selection */}
        {brands.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brand</h4>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
              {brands.map((br) => {
                const isSelected = selectedBrands.includes(br);
                return (
                  <button
                    key={br}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedBrands(selectedBrands.filter(b => b !== br));
                      } else {
                        setSelectedBrands([...selectedBrands, br]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      isSelected 
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {br}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Range */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price Range</h4>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min"
              value={priceMinFilter}
              onChange={(e) => setPriceMinFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all no-spinner"
            />
            <span className="text-gray-400 text-xs font-bold">-</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMaxFilter}
              onChange={(e) => setPriceMaxFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all no-spinner"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Availability & Offers</h4>
          
          {/* Hide Out of Stock / In Stock Only */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight">Hide Out of Stock</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Only show available items</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHideOutOfStock(!hideOutOfStock);
                setInStockOnly(!hideOutOfStock);
              }}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                hideOutOfStock ? 'bg-sky-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  hideOutOfStock ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Discounted Only */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight">On Discount Only</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Show items with offers</p>
            </div>
            <button
              type="button"
              onClick={() => setDiscountedOnly(!discountedOnly)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                discountedOnly ? 'bg-sky-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  discountedOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* New Arrivals */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight">New Arrivals</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Show recently added products</p>
            </div>
            <button
              type="button"
              onClick={() => setNewArrivalsOnly(!newArrivalsOnly)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                newArrivalsOnly ? 'bg-sky-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  newArrivalsOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Best Sellers */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight">Best Sellers Only</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Show top-selling items</p>
            </div>
            <button
              type="button"
              onClick={() => setBestSellersOnly(!bestSellersOnly)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                bestSellersOnly ? 'bg-sky-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  bestSellersOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const fetchShopProducts = async () => {
    try {
      if (!shopId || shopId === 'undefined') {
        setLoading(false);
        return;
      }

      const [shopRes, productsRes] = await Promise.all([
        api.get(`/shops/${shopId}`),
        api.get(`/products?shopId=${shopId}`),
      ]);

      setShop(shopRes.data.shop);
      setProducts(productsRes.data.products || []);
      setFilteredProducts(productsRes.data.products || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopCoupons = async () => {
    // Coupons are now part of the shop object in the 'shops' table
    // We can extract them directly from the shop state once loaded
    if (shop?.coupons) {
      setCoupons(shop.coupons);
    }
  };

  useEffect(() => {
    if (shop) {
      fetchShopCoupons();
    }
  }, [shop]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Coupon code copied!");
  };

  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`dismissedAlerts_${shopId}`);
      if (saved) setDismissedIds(JSON.parse(saved));
    } catch (e) {
      setDismissedIds([]);
    }
  }, [shopId, location.key]); // Re-check when returning to page

  const hasUnreadNotifications = () => {
    const announcementId = `announcement-${shopId}`;
    const showAnnouncementDot = shop?.footerMessage && !dismissedIds.includes(announcementId);
    const unreadCoupons = coupons.filter(c => !dismissedIds.includes(c._id));
    return showAnnouncementDot || unreadCoupons.length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="h-48 bg-sky-900 animate-pulse" />
        <div className="px-5 -mt-10">
          <div className="bg-white rounded-[32px] p-6 shadow-xl flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-100 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="mt-8 px-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      </div>
    );
  }


  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center text-gray-200 mb-8 animate-in zoom-in duration-700">
          <Store size={48} strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2 animate-in fade-in slide-in-from-bottom-2 duration-700">Shop Not Found</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] max-w-xs leading-relaxed mb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
          The storefront you're looking for might have moved, been deactivated, or the link is incorrect.
        </p>
        <button
          onClick={() => navigate('/shops')}
          className="h-14 px-10 bg-gray-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          <ChevronLeft size={18} strokeWidth={3} /> Back to Marketplace
        </button>
      </div>
    );
  }

  const searchSuggestions = products
    .filter(p => searchQuery && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="min-h-full bg-gray-50 pb-16 font-sans relative">
      <SEO 
        title={shop.name} 
        description={`Shop fresh products from ${shop.name} on Grozy. Quality groceries and fast delivery.`}
        canonical={`/shop/${shopId}`}
        ogImage={shop.bannerUrl || shop.imageUrl}
      />

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-sky-600 text-white px-8 py-4 rounded-[32px] shadow-2xl shadow-sky-200 border border-sky-500 flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-full">
               <Check size={20} strokeWidth={3} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Success</p>
               <h3 className="text-sm font-black uppercase tracking-tighter leading-none">Order placed successfully</h3>
            </div>
          </div>
        </div>
      )}

      {/* Premium Hero Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
        
        {/* Nav row */}
        <div className="relative px-5 pt-8 md:pt-10 flex items-center justify-between z-20">
          <button
            onClick={() => navigate('/shops')}
            className="w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10 backdrop-blur-sm"
          >
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] leading-none mb-1">
               {shop.category || 'Grocery'}
             </span>
             <div className="w-8 h-0.5 bg-sky-500 rounded-full opacity-50" />
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="relative w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10 backdrop-blur-sm"
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-rose-900/20">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Offline / Holiday Banner - Integrated into Hero */}
        {shop && !isShopOpen(shop) && (
          <div className="relative px-5 pt-8 animate-in slide-in-from-top-4 duration-700">
            {(() => {
              let holidayReason = null;
              if (shop.holidays?.length > 0) {
                const today = new Date();
                const activeHoliday = shop.holidays.find(h => {
                  const start = new Date(h.startDate); start.setHours(0, 0, 0, 0);
                  const end = new Date(h.endDate); end.setHours(23, 59, 59, 999);
                  return today >= start && today <= end;
                });
                if (activeHoliday) holidayReason = activeHoliday.reason;
              }

              return (
                <div className="bg-rose-500/90 backdrop-blur-md text-white px-5 py-4 rounded-[32px] shadow-2xl border border-white/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                      {holidayReason ? <CalendarX size={20} className="text-white" /> : <Clock size={20} className="animate-pulse text-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-widest leading-none mb-1.5 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        {holidayReason ? 'Shop on Holiday' : 'Orders Accepted'}
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-90 leading-tight max-w-[180px]">
                        {holidayReason ? `Closed for: ${holidayReason}` : "We're currently offline. Place your order now & we'll contact you soon!"}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (holidayReason) toast.info(`Shop is closed due to: ${holidayReason}`);
                      else toast.info(`Operating Hours: ${shop.operatingHours?.start || 'N/A'} - ${shop.operatingHours?.end || 'N/A'}`);
                    }}
                    className="px-4 h-10 bg-white text-rose-500 hover:bg-rose-50 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 shadow-lg"
                  >
                    Info
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        <div className="relative px-5 pt-4 pb-4 flex items-center gap-4">
          <Logo variant="icon" className="w-12 h-12 rounded-[18px] shadow-xl shrink-0 border border-white/10 bg-white/5 backdrop-blur-md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-white tracking-tight uppercase leading-none truncate">{shop.name}</h2>
              {isShopOpen(shop) && (
                <span className="text-[7px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Open</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.location?.address || shop.name)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[9px] font-black text-white/80 uppercase tracking-widest transition-all"
              >
                <MapPin size={10} className="text-sky-400" />
                Map
              </a>
              {shop.phone && (
                <a href={`tel:${shop.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 border border-sky-500/20 rounded-full text-[9px] font-black text-sky-300 uppercase tracking-widest transition-all"
                >
                  <Phone size={10} /> Call
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Promo Banner - Compact */}
        {shop.promoBanner && (
          <div className="relative px-5 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg group">
               <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10">
                     <Ticket size={20} className="text-sky-400" />
                  </div>
                  <div>
                     <p className="text-[7px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">PROMOTION</p>
                     <h3 className="text-xs font-black text-white uppercase tracking-tight leading-none">{shop.promoBanner}</h3>
                  </div>
               </div>
               <button 
                 onClick={() => setIsPromoModalOpen(true)}
                 className="px-3 h-8 bg-white text-sky-600 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
               >
                 Details
               </button>
            </div>
          </div>
        )}

        {/* Frosted Search Bar - Compact */}
        <div className="relative px-5 pb-6">
          <form onSubmit={(e) => e.preventDefault()} className="relative group">
            <button 
              type="button"
              className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40 z-10"
            >
              <Search size={14} />
            </button>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              className="w-full pl-9 pr-8 py-2.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-white/25 focus:outline-none focus:bg-white/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-white/30 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}

            {/* Search Suggestions Dropdown */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                {searchSuggestions.map(p => (
                  <button
                    key={p._id}
                    onClick={() => {
                      setSearchQuery(p.name);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full px-5 py-3 text-left hover:bg-sky-50 flex items-center gap-3 transition-colors border-b last:border-0"
                  >
                    <div className="w-9 h-9 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                      <img src={p.imageUrl || null} alt={p.name || 'Product'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-black text-gray-900 line-clamp-1">{p.name}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{p.category}</span>
                    </div>
                    <span className="text-xs text-sky-600 font-black shrink-0">₹{p.price}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>


      {/* Menu Sections */}
      <div className="mt-4 px-5 space-y-4 pb-10 w-full max-w-[1600px] mx-auto">

        {/* Promotional Banners Carousel */}
        {banners.length > 0 && (
          <div className="relative overflow-hidden w-full bg-white border border-gray-150 rounded-[32px] shadow-sm p-2 mb-6 group/carousel select-none">
            <div className="relative h-48 md:h-64 rounded-[26px] overflow-hidden bg-gradient-to-r from-sky-900 to-indigo-900 text-white flex items-center justify-between">
              {/* Slides container */}
              <div 
                className="absolute inset-0 flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
              >
                {banners.map((banner, index) => (
                  <div 
                    key={banner._id} 
                    onClick={() => navigate(`/shop/${shopId}/banner/${banner._id}`)}
                    className="w-full h-full shrink-0 flex items-center justify-between relative cursor-pointer group"
                  >
                    {/* Background Image / Pattern */}
                    {banner.image ? (
                      <>
                        <img 
                          src={banner.image} 
                          alt={banner.title} 
                          className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 via-indigo-900 to-black" />
                    )}

                    {/* Banner Message Content */}
                    <div className="relative z-10 px-8 md:px-16 py-6 max-w-lg md:max-w-2xl space-y-2 md:space-y-4">
                      <span className="inline-block px-3 py-1 bg-sky-500/90 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                        {banner.type}
                      </span>
                      <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight uppercase line-clamp-2 drop-shadow-md">
                        {banner.title}
                      </h2>
                      {banner.subtitle && (
                        <p className="text-xs md:text-sm font-semibold text-gray-200 line-clamp-1 drop-shadow text-left">
                          {banner.subtitle}
                        </p>
                      )}
                      
                      <button className="h-9 px-4 mt-2 bg-white text-gray-900 hover:bg-sky-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 w-fit">
                        <span>View Offer Items</span>
                        <ArrowRight size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {banners.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentBannerIndex(prev => (prev - 1 + banners.length) % banners.length);
                    }}
                    className="absolute left-4 z-20 w-10 h-10 rounded-xl bg-black/45 text-white hover:bg-black/60 transition-all flex items-center justify-center backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100"
                  >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
                    }}
                    className="absolute right-4 z-20 w-10 h-10 rounded-xl bg-black/45 text-white hover:bg-black/60 transition-all flex items-center justify-center backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100"
                  >
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </button>
                </>
              )}

              {/* Indicators Dots */}
              {banners.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentBannerIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${currentBannerIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.25em]">Exclusive Menu</h3>
            <p className="text-[10px] font-black text-sky-500 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full uppercase tracking-widest">{filteredProducts.length} Results</p>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Quick Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-700 outline-none cursor-pointer appearance-none shadow-sm hover:border-gray-300 transition-all"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="newArrivals">New Arrivals</option>
                <option value="bestSelling">Best Selling</option>
                <option value="popularity">Most Popular</option>
                <option value="highestDiscount">Highest Discount</option>
                <option value="aToZ">Name: A to Z</option>
                <option value="zToA">Name: Z to A</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronRight size={10} className="rotate-90" />
              </div>
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border shadow-sm ${
                activeFiltersCount > 0
                  ? 'bg-sky-500 border-sky-400 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={10} strokeWidth={2.5} />
              <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2 animate-in fade-in duration-300">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">Active:</span>
            
            {sortBy !== 'recommended' && (
              <FilterChip label={`Sort: ${sortBy}`} onClear={() => setSortBy('recommended')} />
            )}
            {selectedBrands.map(br => (
              <FilterChip key={br} label={`Brand: ${br}`} onClear={() => setSelectedBrands(selectedBrands.filter(b => b !== br))} />
            ))}
            {priceMinFilter !== '' && (
              <FilterChip label={`Min: ₹${priceMinFilter}`} onClear={() => setPriceMinFilter('')} />
            )}
            {priceMaxFilter !== '' && (
              <FilterChip label={`Max: ₹${priceMaxFilter}`} onClear={() => setPriceMaxFilter('')} />
            )}
            {hideOutOfStock && (
              <FilterChip label="In Stock Only" onClear={() => { setHideOutOfStock(false); setInStockOnly(false); }} />
            )}
            {discountedOnly && (
              <FilterChip label="Discounted" onClear={() => setDiscountedOnly(false)} />
            )}
            {newArrivalsOnly && (
              <FilterChip label="New Arrivals" onClear={() => setNewArrivalsOnly(false)} />
            )}
            {bestSellersOnly && (
              <FilterChip label="Best Sellers" onClear={() => setBestSellersOnly(false)} />
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

        {/* Product Grid - Compact List/Grid */}
        <div className="flex gap-6 items-start mt-6 w-full">


          {/* Product Listing Area */}
          <div className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-6">
             <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200">
                {sortOrder === 'relevant' ? <Clock size={48} strokeWidth={1} /> : <ShoppingBag size={48} strokeWidth={1} />}
             </div>
             <div className="space-y-2 px-6">
                <h3 className="text-gray-900 font-black text-lg uppercase tracking-tight">
                  {sortOrder === 'relevant' ? "Your list is empty" : "No results found"}
                </h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest max-w-[220px] mx-auto leading-relaxed">
                  {sortOrder === 'relevant' 
                    ? "Order items from this shop to see them appear here in your personalized shortcut." 
                    : "Try adjusting your filters or search keywords to find what you're looking for."}
                </p>
                {sortOrder === 'relevant' && (
                  <button 
                    onClick={() => {
                      setSortOrder('alpha');
                      setActiveCategory('All');
                    }}
                    className="mt-6 px-8 py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-100 transition-all active:scale-95"
                  >
                    Browse Full Menu
                  </button>
                )}
             </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 px-1 md:gap-4">
          {paginatedProducts.map(product => {
            const productId = (product._id || product.id || '').toString();
            const inCart = cart.find(item => {
              const id = (item.product?._id || item.product?.id || '').toString();
              return id === productId;
            });
            const outOfStock = (product.stockQuantity ?? product.stock ?? 0) <= 0;
            const discount = product.mrp > product.price
              ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
              : 0;
            
            const isB2BClient = shop?.isWholesale && user?.phone && shop?.b2bPartners?.some(p => p.phone === user.phone);
            const isBusinessApplied = isB2BClient && product.businessPrice > 0;
            const isWholesaleApplied = !isBusinessApplied && shop?.isWholesale && product.wholesalePrice > 0 && (inCart?.quantity || 0) >= (product.minimumOrderQuantity || 1);
            
            const currentPrice = isBusinessApplied ? product.businessPrice : (isWholesaleApplied ? product.wholesalePrice : product.price);
            return (
              <div key={productId} id={`product-${productId}`}>
                <div
                  onClick={() => setSelectedProduct(product)}
                  className={`group bg-white rounded-[24px] overflow-hidden border flex flex-col shadow-sm cursor-pointer transition-all ${
                    outOfStock
                      ? 'opacity-60 grayscale-[0.4] border-gray-100'
                      : 'border-gray-100 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-50 active:scale-[0.98]'
                  }`}
                >
                  {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={product.image || product.imageUrl || (product.images && product.images[0]) || null}
                        alt={product.name || ''}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-500 ${!outOfStock && 'group-hover:scale-105'}`}
                        style={{
                          objectPosition: product.imageSettings?.[0]?.position || '50% 50%',
                          transform: `scale(${(product.imageSettings?.[0]?.zoom || 100) / 100})`,
                          transformOrigin: product.imageSettings?.[0]?.position || '50% 50%'
                        }}
                      />

                    {/* Shadow overlay for price visibility */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Top badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">

                      {outOfStock && (
                        <span className="bg-rose-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                          Sold Out
                        </span>
                      )}
                      {shop?.isWholesale && product.minimumOrderQuantity > 1 && (
                        <span className="bg-sky-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md border border-sky-400/30">
                          Min: {product.minimumOrderQuantity}
                        </span>
                      )}
                    </div>

                    {/* ⭐ Rating Highlight */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-white/20 animate-in zoom-in-50 duration-500">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-black text-slate-900 leading-none">
                        {Number(product.rating || 0).toFixed(1)}
                      </span>
                    </div>

                    {/* Owner delete */}
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.error(`Delete ${product.name}?`, {
                            action: {
                              label: "Delete",
                              onClick: () => {
                                deleteProduct(productId).then(res => {
                                  if (res.success) { toast.success('Product deleted'); fetchShopProducts(); }
                                });
                              }
                            }
                          });
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}

                    {/* Price Overlay (Directly from Screenshot) */}
                    <div className="absolute bottom-3 left-3 flex flex-col pointer-events-none">
                      <span className="text-[7px] font-black bg-white/90 text-gray-900 px-2 py-0.5 rounded w-fit uppercase tracking-widest leading-none mb-1 shadow-sm">
                        {isBusinessApplied ? 'Business Rate' : (isWholesaleApplied ? 'Wholesale Price' : 'Standard Retail Price')}
                      </span>
                      <span className="text-2xl font-black text-white tracking-tighter leading-none drop-shadow-lg">
                        ₹{Math.round(currentPrice || product.mrp)}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-3 flex flex-col gap-2.5">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight text-gray-900 leading-none mb-3">
                        {product.name}
                      </h4>

                      {/* Bulk Rate Section (Blue Box from Screenshot) */}
                      {shop.isWholesale && product.wholesalePrice > 0 && (
                        <div className={`p-3 rounded-[18px] border mb-3 transition-all ${isWholesaleApplied ? 'bg-sky-500 border-sky-600 text-white shadow-lg shadow-sky-200' : 'bg-sky-50 border-sky-100 text-sky-900'}`}>
                          <div className="flex items-center justify-between mb-1">
                             <p className={`text-[10px] font-black uppercase tracking-widest ${isWholesaleApplied ? 'text-white' : 'text-sky-600'}`}>
                               Bulk Rate: ₹{product.wholesalePrice}
                             </p>
                             {isWholesaleApplied && <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm" />}
                          </div>
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${isWholesaleApplied ? 'text-white/80' : 'text-sky-400'}`}>
                            Order {product.minimumOrderQuantity}+ items to unlock
                          </p>
                        </div>
                      )}

                      {/* Stock Status (Bottom Left with Dot) */}
                      <div className="flex items-center gap-1.5 px-0.5">
                        <div className={`w-2 h-2 rounded-full ${outOfStock ? 'bg-rose-400' : 'bg-emerald-500 animate-pulse shadow-sm'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${outOfStock ? 'text-rose-400' : 'text-emerald-600'}`}>
                          {outOfStock ? '0 Left' : `${Number(parseFloat(product.stockQuantity || product.stock || 0).toFixed(2))} Left`}
                        </span>
                      </div>
                    </div>

                    {/* Cart Controls */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {inCart ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {product.sellingType === 'weight' ? (
                              <button
                                onClick={() => setWeighingProduct(product)}
                                className="flex-1 flex items-center justify-center gap-1 bg-sky-50 text-sky-700 h-8 rounded-xl border border-sky-100 font-black text-[9px] transition-all active:scale-95"
                              >
                                <Eye size={12} /> {parseFloat(Number(inCart.quantity).toFixed(3))} KG
                              </button>
                            ) : (
                               <div className="flex-1 flex items-center bg-sky-600 rounded-xl p-0.5 gap-1 h-8">
                                <button
                                  onClick={() => updateQuantity(productId, -1, shopId)}
                                  className="flex-1 h-full flex items-center justify-center text-white hover:text-sky-400 transition-all active:scale-75 font-black text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Minus size={11} strokeWidth={4} />
                                </button>
                                <span className="text-white font-black text-xs min-w-[14px] text-center">{parseFloat(Number(inCart.quantity).toFixed(3))}</span>
                                <button
                                  onClick={() => updateQuantity(productId, 1, shopId)}
                                  className="flex-1 h-full flex items-center justify-center text-white hover:text-sky-400 transition-all active:scale-75 font-black text-base"
                                >
                                  <Plus size={11} strokeWidth={4} />
                                </button>
                              </div>
                            )}
                            
                            <button
                              onClick={() => navigate('/cart')}
                              className="w-8 h-8 flex items-center justify-center bg-sky-600 text-white rounded-xl shadow-lg hover:bg-sky-700 transition-all active:scale-90 shrink-0"
                              title="Go to Cart"
                            >
                              <ShoppingCart size={14} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => removeFromCart(productId, shopId)}
                              className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-90 shrink-0"
                              title="Remove from Cart"
                            >
                              <Trash2 size={13} />
                            </button>

                            {shop.isWholesale && product.wholesalePrice > 0 && product.minimumOrderQuantity > 1 && !outOfStock && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(product, shopId, product.minimumOrderQuantity);
                                }}
                                className="flex-1 h-8 bg-sky-100 text-sky-700 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-sky-200 border border-sky-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <Plus size={10} strokeWidth={4} /> Bulk ({product.minimumOrderQuantity})
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!outOfStock) {
                                if (product.sellingType === 'weight') {
                                  setWeighingProduct(product);
                                } else {
                                  addToCart(product, shopId);
                                }
                              }
                            }}
                            disabled={outOfStock}
                            className={`w-full h-8 rounded-xl flex items-center justify-center gap-1 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${
                              outOfStock
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                : 'bg-sky-500 text-white hover:bg-sky-600 shadow-md shadow-sky-200'
                            }`}
                          >
                            <Plus size={11} strokeWidth={3} /> Add
                          </button>

                          {shop.isWholesale && product.wholesalePrice > 0 && product.minimumOrderQuantity > 1 && !outOfStock && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(product, shopId, product.minimumOrderQuantity);
                              }}
                              className="w-full h-8 bg-sky-50 text-sky-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-sky-100 border border-sky-200 transition-all active:scale-95 flex items-center justify-center gap-1"
                            >
                              Bulk ({product.minimumOrderQuantity})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 pb-10">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-30 hover:bg-sky-50 hover:text-sky-600 transition-all shadow-sm"
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            
            <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-[22px] p-1 shadow-sm">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[2.5rem] h-10 px-2 rounded-[18px] text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-sky-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-30 hover:bg-sky-50 hover:text-sky-600 transition-all shadow-sm"
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Product Details Modal Overlay */}
      <ProductDetailsModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct}
        cartItem={cart.find(c => {
           const id = (c.product?._id || c.product?.id || '').toString();
           return id === (selectedProduct?._id || selectedProduct?.id || '').toString();
        })}
        addToCart={(p) => {
          if (p.sellingType === 'weight') {
            setSelectedProduct(null);
            setWeighingProduct(p);
          } else {
            addToCart(p);
          }
        }}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
      />

      {/* Floating View Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40 animate-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={() => navigate('/cart')}
            className="w-full bg-gradient-to-r from-sky-600 to-sky-500 text-white h-14 rounded-2xl shadow-2xl shadow-sky-200 flex items-center justify-between px-6 border border-white/10 group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <ShoppingCart size={16} strokeWidth={3} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">In Shop Cart</p>
                <p className="text-sm font-black uppercase tracking-tight leading-none">{cart.length} Item{cart.length !== 1 ? 's' : ''} added</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-px bg-white/10 mx-1"></div>
              <p className="text-lg font-black tracking-tighter">₹{cartTotal}</p>
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <ArrowRight size={18} />
              </div>
            </div>
          </button>
        </div>
      )}

      <CustomerWeightModal 
        isOpen={!!weighingProduct}
        onClose={() => setWeighingProduct(null)}
        product={weighingProduct}
        initialValue={cart.find(c => (c.product?._id || c.product?.id || '').toString() === (weighingProduct?._id || weighingProduct?.id || '').toString())?.quantity}
        onConfirm={(p, qty) => setItemQuantity(p, qty)}
      />
      <PromoModal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        shop={shop}
      />

      {/* Filter Drawer */}
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
                <h3 className="text-sm font-black uppercase tracking-wider">Filters</h3>
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
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar-visible">
              {renderFilterContent()}
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
export default ShopMenu;
