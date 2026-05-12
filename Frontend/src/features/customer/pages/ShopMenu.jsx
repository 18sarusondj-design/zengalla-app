import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { Store, MapPin, ChevronLeft, ChevronRight, ShoppingBag, Plus, Minus, Loader2, ArrowRight, Search, X, Info, Gift, Bell, Copy, Check, Phone, Clock, Eye, ShoppingCart, Trash2, Sparkles, Ticket, Star } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import FullScreenLoader from '../components/FullScreenLoader';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CustomerWeightModal from '../components/CustomerWeightModal';
import Logo from '../../common/components/Logo';
import ReviewStars from '../components/ReviewStars';
import PromoModal from '../components/PromoModal';

// Product Ratings & Reviews Integration

/**
 * ShopMenu Component - Displays products for a specific shop
 */
const ShopMenu = () => {
  const isShopOpen = (s) => {
    if (!s) return false;
    if (s.isActive === false) return false;
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
  const { cart: allCarts, addToCart, removeFromCart, updateQuantity, setItemQuantity, cartTotal, orders, deleteProduct, deleteCategory, setCurrentShopId, customerGstin } = useStore();
  const cart = allCarts[shopId] || [];
  const { user } = useAuth();
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

  useEffect(() => {
    fetchShopProducts();
    fetchShopCoupons();
  }, [shopId]);

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
    if (selectedProduct || isPromoModalOpen || weighingProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedProduct, isPromoModalOpen, weighingProduct]);

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

      const matchesSearch = pName.includes(query) || pDesc.includes(query) || pCat.includes(query);
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      
      // If 'For You' is active, only show items previously ordered
      if (sortOrder === 'relevant') {
        const pId = String(p._id || p.id);
        if (!orderedProductCounts[pId]) return false;
      }

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      // Rule 1: Move items with exactly 0 stock to the bottom
      const aStock = a.stockQuantity ?? a.stock ?? 0;
      const bStock = b.stockQuantity ?? b.stock ?? 0;
      const aIsZero = (aStock === 0);
      const bIsZero = (bStock === 0);
      
      if (!aIsZero && bIsZero) return -1;
      if (aIsZero && !bIsZero) return 1;

      // Rule 2: Top Rated
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
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products, activeCategory, sortOrder, orders, shopId]);

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
  }, [searchQuery, activeCategory, sortOrder]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const totalPages = Math.ceil((filteredProducts?.length || 0) / ITEMS_PER_PAGE);
  const paginatedProducts = (filteredProducts || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const categories = ['All', ...new Set((products || []).map(p => p.category).filter(Boolean))];

  const fetchShopProducts = async () => {
    try {
      if (!shopId || shopId === 'undefined') return;

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
    return <FullScreenLoader message="Syncing store inventory..." />;
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

        {/* Offline Banner - Integrated into Hero */}
        {shop && !isShopOpen(shop) && (
          <div className="relative px-5 pt-8 animate-in slide-in-from-top-4 duration-700">
            <div className="bg-rose-500/90 backdrop-blur-md text-white px-5 py-4 rounded-[32px] shadow-2xl border border-white/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Clock size={20} className="animate-pulse text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-widest leading-none mb-1.5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Orders Accepted
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-90 leading-tight max-w-[180px]">
                    We're currently offline. Place your order now & we'll contact you soon!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => toast.info(`Operating Hours: ${shop.operatingHours?.start || 'N/A'} - ${shop.operatingHours?.end || 'N/A'}`)}
                className="px-4 h-10 bg-white text-rose-500 hover:bg-rose-50 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 shadow-lg"
              >
                Hours
              </button>
            </div>
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

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.25em]">Exclusive Menu</h3>
          <p className="text-[10px] font-black text-sky-500 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full uppercase tracking-widest">{filteredProducts.length} Results</p>
        </div>

        {/* Unitary Category & Sort Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 items-center">
             <button 
               onClick={() => {
                 setSortOrder('relevant');
                 setActiveCategory('All');
                 toast.success("Most ordered items first", { icon: <Clock size={16} /> });
               }} 
               className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                 sortOrder === 'relevant'
                   ? 'bg-gray-900 text-white shadow-lg'
                   : 'bg-white text-gray-500 border border-gray-200 hover:border-sky-400 hover:text-sky-600'
               }`}
             >
               ★ For You
             </button>

             <button 
               onClick={() => {
                 setSortOrder('top-rated');
                 setActiveCategory('All');
                 toast.success("Highest rated items first", { icon: <Sparkles size={16} /> });
               }} 
               className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                 sortOrder === 'top-rated'
                   ? 'bg-sky-500 text-white shadow-lg'
                   : 'bg-white text-gray-500 border border-gray-200 hover:border-sky-400 hover:text-sky-600'
               }`}
             >
               ★ Top Rated
             </button>

             <div className="w-px h-5 bg-gray-200 mx-1 shrink-0"></div>
          
          {categories.map(cat => (
            <div key={cat} className="relative group/cat shrink-0">
              <button
                onClick={() => {
                  setActiveCategory(cat);
                  setSortOrder('alpha');
                }}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeCategory === cat && sortOrder === 'alpha'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-sky-400 hover:text-sky-600'
                }`}
              >
                {cat}
              </button>
              {isOwner && cat !== 'All' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.error(`Delete category "${cat}"?`, {
                      action: {
                        label: "Delete",
                        onClick: () => {
                          deleteCategory(cat).then(res => {
                            if (res.success) {
                              toast.success(res.message);
                              if (activeCategory === cat) setActiveCategory('All');
                              fetchShopProducts();
                            }
                          });
                        }
                      }
                    });
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/cat:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                  title="Delete Category"
                >
                  <X size={8} strokeWidth={4} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Product Grid - Compact List/Grid */}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 px-1 md:gap-4">
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
                      src={product.image || product.imageUrl || null}
                      alt={product.name || ''}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-500 ${!outOfStock && 'group-hover:scale-105'}`}
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
                          {outOfStock ? '0 Left' : `${product.stockQuantity || product.stock || 0} Left`}
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
                                <Eye size={12} /> {inCart.quantity.toFixed(2)} KG
                              </button>
                            ) : (
                               <div className="flex-1 flex items-center bg-sky-600 rounded-xl p-0.5 gap-1 h-8">
                                <button
                                  onClick={() => updateQuantity(productId, -1, shopId)}
                                  className="flex-1 h-full flex items-center justify-center text-white hover:text-sky-400 transition-all active:scale-75 font-black text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Minus size={11} strokeWidth={4} />
                                </button>
                                <span className="text-white font-black text-xs min-w-[14px] text-center">{inCart.quantity}</span>
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
    </div>
  );
};
export default ShopMenu;
