import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Clock, ChevronRight, Loader2, Search, ChevronLeft, ShoppingCart } from 'lucide-react';
import { useStore } from '../../shop/context/StoreContext';
import { ShopCard } from '../components/ShopCard';
import Logo from '../../common/components/Logo';

/**
 * MyShops Component - Shows shops where the user has previously ordered or visited.
 */
const MyShops = () => {
  const { shops, orders, loading: storeLoading, allCarts, totalCartItemCount } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Small delay to simulate sync and ensure orders are ready
    if (!storeLoading) {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }
  }, [storeLoading]);

  // 1. Identify shops with items in the cart
  const cartShopIds = Object.keys(allCarts || {}).filter(id => (allCarts[id] || []).length > 0).map(String);
  
  // 2. Identify shops from order history
  const orderedShopIds = [...new Set((orders || []).map(o => o.shopId?._id || o.shopId || o.shop?._id || o.shop))].map(String).filter(Boolean);
  
  // 3. Identify shops from visited history
  const visitedShopIds = JSON.parse(localStorage.getItem('visitedShops') || '[]').map(String);
  
  // Combine IDs with Priority: Cart > Orders > Visited
  const combinedIds = [...new Set([...cartShopIds, ...orderedShopIds, ...visitedShopIds])];
  
  const myShopsList = (shops || []).filter(s => combinedIds.includes(String(s._id)));

  // Sort by priority (cartShopIds first, then orderedShopIds, then visitedShopIds)
  myShopsList.sort((a, b) => {
    const idA = String(a._id);
    const idB = String(b._id);
    
    // Helper to get priority score (lower is higher priority)
    const getPriority = (id) => {
      if (cartShopIds.includes(id)) return 1;
      if (orderedShopIds.includes(id)) return 2;
      if (visitedShopIds.includes(id)) return 3;
      return 4;
    };

    const priorityA = getPriority(idA);
    const priorityB = getPriority(idB);

    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // If same priority, maintain order from the combinedIds array (recency)
    return combinedIds.indexOf(idA) - combinedIds.indexOf(idB);
  });

  const filteredMyShops = myShopsList.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || storeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing your order history...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 font-sans w-full">
      {/* Premium Hero Header - Matching ShopList Style */}
      <div className="relative overflow-hidden shrink-0 shadow-lg" style={{background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)'}}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-sky-500/10 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        {/* Nav Row */}
        <div className="relative px-5 pt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-none tracking-tight uppercase">Recent</h1>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Your Visited Stores</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cart')}
              className="relative w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10"
            >
              <ShoppingCart size={20} />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-sky-800 animate-in zoom-in">
                  {Math.floor(totalCartItemCount)}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative px-5 pt-6 pb-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-sky-400 transition-colors">
              <Search size={18} strokeWidth={3} />
            </div>
            <input
              type="text"
              placeholder="Search your recent stores..."
              className="block w-full pl-11 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:bg-white/20 focus:border-white/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-16 space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Recently Visited</h2>
          {filteredMyShops.length > 0 && (
            <span className="text-[9px] bg-sky-50 text-sky-600 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-sky-100">{filteredMyShops.length} Stores</span>
          )}
        </div>
        
        {filteredMyShops.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-6">
            <Logo variant="icon" className="w-24 h-24 rounded-[40px] shadow-sm" />
            <div className="space-y-2">
               <p className="text-gray-900 font-black text-lg">No matches found</p>
               <p className="text-gray-400 text-xs max-w-[200px] mx-auto leading-relaxed">
                 {searchTerm ? "Try searching for another store name." : "Start shopping from nearby stores to build your personal list here."}
               </p>
            </div>
            {!searchTerm && (
              <button 
                onClick={() => navigate('/shops')}
                className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-sky-100"
              >
                Browse Stores
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1400px] mx-auto">
            {filteredMyShops.map((shop, index) => (
              <ShopCard 
                key={`myshops-${shop._id}`}
                shop={shop}
                index={index}
                searchTerm={searchTerm}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShops;
