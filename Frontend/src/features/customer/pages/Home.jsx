import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Minus, ShoppingBag, Sparkles } from 'lucide-react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../config/api.js';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CustomerWeightModal from '../components/CustomerWeightModal';
import PWAInstallButton from '../../common/components/PWAInstallButton';
import { ProductSkeleton } from '../components/Skeleton';

const Home = () => {
  const { products, cart, addToCart, updateQuantity, setItemQuantity } = useStore();
  const { token, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [frequentProducts, setFrequentProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('relevant');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weighingProduct, setWeighingProduct] = useState(null);
  const [loading, setLoading] = useState(products.length === 0);
  const ITEMS_PER_PAGE = 12;

  // ── Video Guide State ──────────────────────────────────────────────
  const USER_GUIDE_VIDEO = {
    title: 'How to Shop Online',
    emoji: '🛒',
    color: 'from-sky-500 to-rose-500',
    langs: {
      EN: 'dQw4w9WgXcQ',
      HI: 'dQw4w9WgXcQ',
      KN: 'dQw4w9WgXcQ',
    }
  };
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLang, setVideoLang] = useState('EN');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchSuggestions = useMemo(() => 
    products
      .filter(p => debouncedSearchQuery && p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      .slice(0, 5),
  [products, debouncedSearchQuery]);

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
  
  const allCategories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = activeCategory === "All" || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).sort((a, b) => {
      if (sortOrder === 'lowPrice') return a.price - b.price;
      if (sortOrder === 'highPrice') return b.price - a.price;
      
      if (!debouncedSearchQuery) return new Date(b.createdAt) - new Date(a.createdAt);
      const q = debouncedSearchQuery.toLowerCase();
      const aStarts = (a.name || '').toLowerCase().startsWith(q);
      const bStarts = (b.name || '').toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [products, activeCategory, debouncedSearchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => 
    filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
  [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, debouncedSearchQuery, sortOrder]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    if (products.length > 0) setLoading(false);
  }, [products]);

  const handleAddToCart = useCallback((product) => {
    if (product.sellingType === 'weight') {
      setWeighingProduct(product);
    } else {
      addToCart(product);
    }
  }, [addToCart]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 transition-colors">
      
      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 px-4 py-3 sticky top-[72px] z-20 shadow-sm border-b border-gray-100 dark:border-slate-800 transition-colors">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search for soaps, rice, snacks..."
            className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all font-medium text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => {
               setSearchQuery(e.target.value);
               setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
          />

          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
               {searchSuggestions.map(p => (
                 <button 
                  key={p._id} 
                  onClick={() => {
                    setSearchQuery(p.name);
                    setShowSearchSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors border-b dark:border-slate-700 last:border-0"
                 >
                   <div className="w-8 h-8 bg-gray-100 dark:bg-slate-900 rounded-lg overflow-hidden shrink-0">
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                   <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{p.name}</span>
                   <span className="ml-auto text-xs text-sky-600 font-black tracking-tighter">₹{p.price}</span>
                 </button>
               ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="px-4 py-4 flex flex-col gap-3">
          <PWAInstallButton variant="banner" />

          <button
            onClick={() => setVideoOpen(true)}
            className="w-full group relative rounded-3xl overflow-hidden border-2 border-sky-100 dark:border-slate-800 hover:border-transparent transition-all hover:shadow-2xl active:scale-[0.98] text-left"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${USER_GUIDE_VIDEO.color} opacity-10 group-hover:opacity-100 transition-all duration-300`} />
            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${USER_GUIDE_VIDEO.color} flex items-center justify-center text-3xl shadow-lg shrink-0`}>
                {USER_GUIDE_VIDEO.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-900 dark:text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{USER_GUIDE_VIDEO.title}</p>
                <p className="text-[10px] font-bold text-gray-400 group-hover:text-white/70 transition-colors mt-0.5 uppercase tracking-widest">Watch in EN · HI · KN</p>
              </div>
              <div className="w-11 h-11 bg-white/80 group-hover:bg-white rounded-2xl flex items-center justify-center shadow shrink-0 transition-all">
                <Play size={18} fill="currentColor" className="text-sky-600 ml-1" />
              </div>
            </div>
          </button>
        </div>

        {frequentProducts.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <div className="px-4 flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">Buy Again</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1.5">Your pantry essentials, saved for speed</p>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-3 px-4 pb-4 scrollbar-hide snap-x">
                {frequentProducts.map(product => {
                  const productId = (product._id || product.id || '').toString();
                  const inCart = cart.find(item => (item.product?._id || item.product?.id || '').toString() === productId);
                return (
                  <div key={productId} className="min-w-[124px] bg-white dark:bg-slate-900 rounded-2xl p-3 border border-gray-100 dark:border-slate-800 shadow-sm snap-start flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-xl overflow-hidden mb-2 relative">
                       <img 
                        src={product.imageUrl || (product.images && product.images[0]) || null} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-all"
                        style={{
                          objectPosition: product.imageSettings?.[0]?.position || '50% 50%',
                          transform: `scale(${(product.imageSettings?.[0]?.zoom || 100) / 100})`,
                          transformOrigin: product.imageSettings?.[0]?.position || '50% 50%'
                        }}
                       />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase leading-none line-clamp-1 mb-1">{product.name}</h3>
                    <p className="text-xs font-bold text-sky-600 mb-2">₹{product.price}</p>
                    
                    {inCart ? (
                      <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-900/30 rounded-lg w-full px-2 py-1">
                        <button onClick={() => updateQuantity(productId, inCart.quantity - 1)} className="p-1 text-sky-600 hover:bg-white dark:hover:bg-slate-800 rounded"><Minus size={12} /></button>
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{inCart.quantity}</span>
                        <button onClick={() => updateQuantity(productId, inCart.quantity + 1)} className="p-1 text-sky-600 hover:bg-white dark:hover:bg-slate-800 rounded"><Plus size={12} /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="w-full py-1.5 bg-sky-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-sky-700 flex items-center justify-center gap-1 shadow-sm"
                      >
                        Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="px-4 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 items-center sticky top-[138px] bg-gray-50/80 dark:bg-slate-950/80 backdrop-blur-md py-2 z-10 transition-colors">
          <div className="flex gap-2 mr-4 border-r pr-4 border-gray-200 dark:border-slate-800">
             <button onClick={() => setSortOrder('relevant')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'relevant' ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-transparent dark:border-slate-700'}`}>Relevance</button>
             <button onClick={() => setSortOrder('lowPrice')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'lowPrice' ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-transparent dark:border-slate-700'}`}>Best Price</button>
          </div>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeCategory === cat ? 'bg-sky-600 text-white border-sky-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 mt-4">
          {loading ? (
            Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
          ) : paginatedProducts.length === 0 ? (
             <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                <Search size={48} className="text-slate-200 dark:text-slate-800" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products found</p>
             </div>
          ) : (
            paginatedProducts.map(product => {
              const productId = (product._id || product.id || '').toString();
              const cartItem = cart.find(c => (c.product?._id || c.product?.id || '').toString() === productId);
              const inStock = Number(product.stockQuantity) > 0;

              return (
                <div key={productId} className="group">
                  <div 
                    onClick={() => setSelectedProduct(product)}
                    className="flex md:flex-col bg-white dark:bg-slate-900 rounded-[32px] p-4 h-full shadow-sm border border-gray-100 dark:border-slate-800 transition-all relative hover:shadow-xl hover:border-sky-100 dark:hover:border-sky-900/50 cursor-pointer overflow-hidden"
                  >
                    {/* Image Area */}
                    <div className="w-24 h-24 md:w-full md:aspect-square bg-gray-50 dark:bg-slate-800 rounded-2xl md:rounded-3xl mb-0 md:mb-4 overflow-hidden relative shrink-0">
                      <img 
                        src={product.imageUrl || (product.images && product.images[0])} 
                        alt={product.name} 
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform group-hover:scale-110 duration-700 ${!inStock ? 'grayscale opacity-50' : ''}`} 
                        style={{
                          objectPosition: product.imageSettings?.[0]?.position || '50% 50%',
                          transform: `scale(${(product.imageSettings?.[0]?.zoom || 100) / 100})`,
                          transformOrigin: product.imageSettings?.[0]?.position || '50% 50%'
                        }}
                      />
                      {!inStock && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-white text-gray-800 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">Out of Stock</span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col pl-4 md:pl-0 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-extrabold text-sm md:text-base text-gray-900 dark:text-white leading-tight truncate uppercase tracking-tight">{product.name}</h3>
                        <Sparkles size={12} className="text-sky-500 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2 min-h-[32px] font-medium leading-relaxed">
                        {product.description || 'Premium store choice.'}
                      </p>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex flex-col">
                          <span className="font-black text-lg md:text-xl text-slate-900 dark:text-white leading-none mb-1">₹{product.price}</span>
                          {inStock && <span className="text-[9px] text-sky-600 dark:text-sky-400 font-bold tracking-widest uppercase">{product.stockQuantity} Left</span>}
                        </div>

                        {cartItem ? (
                          <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-900/40 rounded-xl p-1 text-sky-600 font-bold text-sm">
                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(productId, -1); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm"><Minus size={14} /></button>
                            <span className="w-4 text-center text-xs">{cartItem.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(productId, 1); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm"><Plus size={14} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (inStock) handleAddToCart(product); }}
                            disabled={!inStock}
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${inStock ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 hover:bg-sky-600 hover:text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                          >
                            <Plus size={20} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2 pb-10">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm"
            >
              &lt;
            </button>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[2.5rem] h-10 px-2 rounded-lg text-sm font-black transition-all ${currentPage === i + 1 ? 'bg-sky-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm"
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      <ProductDetailsModal 
        product={selectedProduct}
        cartItem={cart.find(c => (c.product?._id || c.product?.id || '').toString() === (selectedProduct?._id || selectedProduct?.id || '').toString())}
        addToCart={handleAddToCart}
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
