import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Store, ShoppingBag, ArrowRight, Play, Video, Globe } from 'lucide-react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../config/api.js';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CustomerWeightModal from '../components/CustomerWeightModal';
import PWAInstallButton from '../../common/components/PWAInstallButton';

const CATEGORIES = [
  'All',
  'Fruits',
  'Vegetables',
  'Dairy',
  'Bakery',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Frozen',
  'Electronics'
];

const Home = () => {
  const { products, cart, addToCart, updateQuantity, setItemQuantity } = useStore();
  const { token, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [frequentProducts, setFrequentProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('relevant');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weighingProduct, setWeighingProduct] = useState(null);
  const ITEMS_PER_PAGE = 12;

  // ── Video Guide State ──────────────────────────────────────────────
  // 🔧 TO UPDATE: Replace the YouTube video IDs with your actual ones.
  // Get the ID from: https://youtube.com/watch?v=VIDEO_ID_HERE
  const USER_GUIDE_VIDEO = {
    title: 'How to Shop Online',
    emoji: '🛒',
    color: 'from-sky-500 to-rose-500',
    langs: {
      EN: 'dQw4w9WgXcQ', // ← Replace with English video ID
      HI: 'dQw4w9WgXcQ', // ← Replace with Hindi video ID
      KN: 'dQw4w9WgXcQ', // ← Replace with Kannada video ID
    }
  };
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLang, setVideoLang] = useState('EN');
  // ──────────────────────────────────────────────────────────────────

  const searchSuggestions = products
    .filter(p => searchQuery && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  useEffect(() => {
    if (token && user?._id) {
      const fetchFrequent = async () => {
        try {
          const { data } = await api.get('/orders/frequent');
          if (data && data.products) {
            setFrequentProducts(data.products);
          }
        } catch (err) {
          console.error("Failed to fetch reorder items:", err);
        }
      };
      fetchFrequent();
    }
  }, [token, user?._id]);
  
  const allCategories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  
  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    if (sortOrder === 'lowPrice') return a.price - b.price;
    if (sortOrder === 'highPrice') return b.price - a.price;
    
    // Default: prioritize search match at start, then date
    if (!searchQuery) return new Date(b.createdAt) - new Date(a.createdAt);
    const q = searchQuery.toLowerCase();
    const aStarts = (a.name || '').toLowerCase().startsWith(q);
    const bStarts = (b.name || '').toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortOrder]);

  // Scroll to top when page changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* Search Bar (Dedicated on Home) */}
      <div className="bg-white px-4 py-3 sticky top-[72px] z-20 shadow-sm border-b border-gray-100">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <button 
            type="button" 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-500 transition-colors z-10"
          >
            <Search size={18} />
          </button>
          <input
            type="text"
            placeholder="Search for soaps, rice, snacks..."
            className="w-full bg-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all font-medium placeholder:text-gray-500"
            value={searchQuery}
            onChange={(e) => {
               setSearchQuery(e.target.value);
               setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
          />

          {/* Search Suggestions Dropdown */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
               {searchSuggestions.map(p => (
                 <button 
                  key={p._id} 
                  onClick={() => {
                    setSearchQuery(p.name);
                    setShowSearchSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b last:border-0"
                 >
                   <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                   <span className="text-sm font-bold text-gray-900 line-clamp-1">{p.name}</span>
                   <span className="ml-auto text-xs text-brand-primary font-black tracking-tighter">₹{p.price}</span>
                 </button>
               ))}
            </div>
          )}
        </form>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto pb-4">

        {/* Video Guide & PWA Install Banner */}
        <div className="px-4 py-4 flex flex-col gap-3">
          <PWAInstallButton variant="banner" />

          <button
            onClick={() => setVideoOpen(true)}
            className="w-full group relative rounded-3xl overflow-hidden border-2 border-sky-100 hover:border-transparent transition-all hover:shadow-2xl active:scale-[0.98] text-left"
          >
            {/* Animated gradient bg */}
            <div className={`absolute inset-0 bg-gradient-to-r ${USER_GUIDE_VIDEO.color} opacity-10 group-hover:opacity-100 transition-all duration-300`} />

            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${USER_GUIDE_VIDEO.color} flex items-center justify-center text-3xl shadow-lg shrink-0`}>
                {USER_GUIDE_VIDEO.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-900 group-hover:text-white transition-colors uppercase tracking-tight">{USER_GUIDE_VIDEO.title}</p>
                <p className="text-[10px] font-bold text-gray-400 group-hover:text-white/70 transition-colors mt-0.5 uppercase tracking-widest">Watch in EN · HI · KN</p>
              </div>
              {/* Play button */}
              <div className="w-11 h-11 bg-white/80 group-hover:bg-white rounded-2xl flex items-center justify-center shadow shrink-0 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#E65100">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Video Modal */}
        {videoOpen && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8"
            style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setVideoOpen(false)}
          >
            <div
              className="w-full max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-300"
              style={{ maxHeight: '92vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${USER_GUIDE_VIDEO.color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{USER_GUIDE_VIDEO.emoji}</span>
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-widest leading-none">{USER_GUIDE_VIDEO.title}</p>
                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">Select your language below</p>
                  </div>
                </div>
                <button
                  onClick={() => setVideoOpen(false)}
                  className="w-9 h-9 bg-white/20 hover:bg-white/40 rounded-xl flex items-center justify-center text-white transition-all font-black"
                >
                  ✕
                </button>
              </div>

              {/* Language Tabs */}
              <div className="flex gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
                {['EN', 'HI', 'KN'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setVideoLang(lang)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                      videoLang === lang
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {lang === 'EN' ? '🇬🇧 English' : lang === 'HI' ? '🇮🇳 Hindi' : '🌿 Kannada'}
                  </button>
                ))}
                <p className="ml-auto text-[9px] text-gray-400 font-bold uppercase tracking-widest self-center italic">Click outside to close</p>
              </div>

              {/* YouTube Embed — auto 16:9 */}
              <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe
                  key={videoLang}
                  src={`https://www.youtube.com/embed/${USER_GUIDE_VIDEO.langs[videoLang]}?rel=0&modestbranding=1&autoplay=1`}
                  title={USER_GUIDE_VIDEO.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Frequently Ordered / Buy Again Section */}
        {frequentProducts.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <div className="px-4 flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Buy Again</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Your pantry essentials, saved for speed</p>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-3 px-4 pb-4 scrollbar-hide snap-x">
                {frequentProducts.map(product => {
                  const productId = (product._id || product.id || '').toString();
                  const inCart = cart.find(item => {
                    const id = (item.product?._id || item.product?.id || '').toString();
                    return id === productId;
                  });
                return (
                  <div key={product._id} className="min-w-[124px] bg-white rounded-2xl p-3 border border-gray-100 shadow-sm snap-start flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden mb-2">
                       <img src={product.imageUrl || null} alt={product.name} className="w-full h-full object-cover"/>
                    </div>
                    <h3 className="text-[10px] font-black text-gray-900 uppercase leading-none line-clamp-1 mb-1">{product.name}</h3>
                    <p className="text-xs font-bold text-brand-primary mb-2">₹{product.price}</p>
                    
                    {inCart ? (
                      <div className="flex items-center justify-between bg-brand-primaryLight rounded-lg w-full px-2 py-1">
                        <button onClick={() => updateQuantity(product._id, inCart.quantity - 1)} className="p-1 text-brand-primary hover:bg-white rounded"><Minus size={12} /></button>
                        <span className="text-xs font-bold text-brand-primary">{inCart.quantity}</span>
                        <button onClick={() => updateQuantity(product._id, inCart.quantity + 1)} className="p-1 text-brand-primary hover:bg-white rounded"><Plus size={12} /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          if (product.sellingType === 'weight') {
                            setWeighingProduct(product);
                          } else {
                            addToCart(product);
                          }
                        }}
                        className="w-full py-1.5 bg-brand-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-sky-700 flex items-center justify-center gap-1"
                      >
                        <ShoppingBag size={10} /> Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories & Sorting (Horizontal Scroll) */}
        <div className="px-4 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 items-center sticky top-[138px] bg-gray-50/80 backdrop-blur-md py-2 z-10">
          <div className="flex gap-2 mr-4 border-r pr-4 border-gray-200">
             <button onClick={() => setSortOrder('relevant')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${sortOrder === 'relevant' ? 'bg-slate-900 text-white' : 'bg-white text-gray-500 border'}`}>Relevance</button>
             <button onClick={() => setSortOrder('lowPrice')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${sortOrder === 'lowPrice' ? 'bg-slate-900 text-white' : 'bg-white text-gray-500 border'}`}>Best Price</button>
          </div>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeCategory === cat ? 'bg-brand-primary text-white border-brand-primary shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product List/Grid */}
        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 sm:gap-6">
          {paginatedProducts.map(product => {
            const productId = (product._id || product.id || '').toString();
            const cartItem = cart.find(c => (c.product._id || c.product.id || '').toString() === productId);
            const inStock = Number(product.stockQuantity) > 0;

            return (
              <div key={productId}>
                {/* Desktop Card (hidden on mobile) */}
                <div 
                  onClick={() => setSelectedProduct(product)}
                  className="hidden md:flex flex-col bg-white rounded-[32px] p-5 h-full shadow-sm border border-gray-100 transition-all relative group hover:shadow-lg cursor-pointer"
                >
                  <div className="aspect-square bg-gray-50 rounded-3xl mb-4 overflow-hidden relative">
                    <img src={product.imageUrl || null} alt="" referrerPolicy="no-referrer" className={`w-full h-full object-cover transition-transform group-hover:scale-105 duration-500 ${!inStock ? 'grayscale opacity-70' : ''}`} />
                    {!inStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-gray-800 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Out of Stock</span>
                      </div>
                    )}
                    {inStock && product.stockQuantity > 0 && product.stockQuantity < 5 && (
                      <div className="absolute top-3 right-3 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest animate-pulse shadow-lg font-mono">
                        Only {product.stockQuantity} Left!
                      </div>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-gray-900 leading-tight mb-1 truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[32px] font-medium leading-normal">{product.description}</p>

                  <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="font-black text-xl leading-none mb-1.5">₹{product.price}</span>
                      {inStock && <span className="text-[10px] text-sky-600 font-bold tracking-wider uppercase px-2 py-1 bg-sky-50 rounded-lg w-fit">{product.stockQuantity} left</span>}
                    </div>

                    {cartItem ? (
                      <div className="flex items-center gap-1.5 bg-brand-primaryLight rounded-2xl p-1 text-brand-primary font-bold text-sm">
                        <button onClick={() => updateQuantity(productId, -1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white shadow-sm hover:shadow-md transition-all"><Minus size={14} /></button>
                        <span className="w-5 text-center">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(productId, 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-primary text-white hover:bg-sky-700 transition-all shadow-sm"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inStock) {
                            if (product.sellingType === 'weight') {
                              setWeighingProduct(product);
                            } else {
                              addToCart(product);
                            }
                          }
                        }}
                        disabled={!inStock}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${inStock ? 'bg-brand-primaryLight text-brand-primary hover:bg-brand-primary hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <Plus size={24} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile Row Layout (visible only on mobile) */}
                <div 
                   onClick={() => setSelectedProduct(product)}
                   className="md:hidden flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {/* Left: Image & Name */}
                  <div className="flex flex-col items-center w-[84px] shrink-0 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden mb-1.5 border border-gray-100">
                      <img src={product.imageUrl || null} alt="" referrerPolicy="no-referrer" className={`w-full h-full object-cover ${!inStock ? 'grayscale opacity-70' : ''}`} />
                    </div>
                    <h3 className="font-bold text-[11px] leading-tight text-gray-900 line-clamp-2 w-full">{product.name}</h3>
                  </div>

                  {/* Middle: Description, Stock, Price */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <p className="text-[10px] text-gray-500 font-medium italic truncate mb-1">{product.description || 'Premium store choice.'}</p>
                    <div className="flex flex-col gap-0.5">
                       {inStock ? (
                         <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-1.5 py-0.5 rounded-md w-fit">{product.stockQuantity} Remaining</span>
                       ) : (
                         <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-md w-fit">Out of Stock</span>
                       )}
                       <span className="font-extrabold text-lg text-gray-900">₹{product.price}</span>
                    </div>
                  </div>

                  {/* Right: Add/Quantity Controls */}
                  <div className="flex flex-col items-end gap-2">
                    {cartItem ? (
                      <div className="flex items-center gap-2 bg-gray-900 rounded-xl p-1 text-white">
                        <button onClick={() => updateQuantity(productId, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><Minus size={14} strokeWidth={3} /></button>
                        <span className="text-xs font-black px-1">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(productId, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-600 shadow-sm"><Plus size={14} strokeWidth={3} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inStock) {
                            if (product.sellingType === 'weight') {
                              setWeighingProduct(product);
                            } else {
                              addToCart(product);
                            }
                          }
                        }}
                        disabled={!inStock}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${inStock ? 'bg-brand-primaryLight text-brand-primary hover:bg-brand-primary hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 pb-10">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
            >
              &lt;
            </button>
            
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[2.5rem] h-10 px-2 rounded-lg text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      <ProductDetailsModal 
        product={selectedProduct}
        cartItem={cart.find(c => (c.product?._id || c.product?.id || '').toString() === (selectedProduct?._id || selectedProduct?.id || '').toString())}
        addToCart={(p) => {
          if (p.sellingType === 'weight') {
            setSelectedProduct(null);
            setWeighingProduct(p);
          } else {
            addToCart(p);
          }
        }}
        updateQuantity={updateQuantity}
      />

      <CustomerWeightModal 
        isOpen={!!weighingProduct}
        onClose={() => setWeighingProduct(null)}
        product={weighingProduct}
        initialValue={cart.find(c => (c.product?._id || c.product?.id || '').toString() === (weighingProduct?._id || weighingProduct?.id || '').toString())?.quantity}
        onConfirm={(p, qty) => setItemQuantity(p, qty)}
      />
    </div>
  );
};

export default Home;
