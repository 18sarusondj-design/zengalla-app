import React from 'react';
import { 
  MapPin, 
  Clock, 
  ChevronRight, 
  Search, 
  Sparkles, 
  Star 
} from 'lucide-react';
import Logo from '../../common/components/Logo';
import ReviewStars from './ReviewStars';

export const ShopCard = ({ shop, index, searchTerm, navigate }) => {
  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

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

  const isOpen = isShopOpen(shop);

  return (
    <div
      key={shop?._id || index}
      onClick={() => navigate(`/shop/${shop?._id}${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`)}
      className={`relative bg-white rounded-[32px] overflow-hidden border shadow-sm ${
        shop.isSponsored ? 'border-sky-200/60 shadow-sky-100' : 'border-gray-50'
      } group transition-all hover:shadow-2xl hover:shadow-sky-100/50 hover:border-sky-100 cursor-pointer active:scale-[0.98] ${
        !isOpen && 'opacity-80'
      }`}
    >
      {/* Sponsored glow ring */}
      {shop.isSponsored && (
        <div className="absolute inset-0 rounded-[32px] ring-2 ring-sky-300/40 pointer-events-none z-10" />
      )}

      {/* Shop Image */}
      <div className={`h-48 bg-gray-100 relative overflow-hidden transition-transform duration-700 ease-out ${isOpen && 'group-hover:scale-105'}`}>
        <img
          src={shop.bannerUrl || shop.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'}
          alt={shop.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Bottom badges */}
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isOpen ? 'bg-sky-500' : 'bg-rose-500'}`}>
              {isOpen ? 'Open Now' : 'Closed'}
            </div>
            {shop.operatingHours?.enabled && shop.operatingHours?.start && shop.operatingHours?.end && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[8px] font-black uppercase tracking-widest">
                <Clock size={8} strokeWidth={3} />
                {fmtTime(shop.operatingHours.start)} – {fmtTime(shop.operatingHours.end)}
              </div>
            )}
          </div>
          
          {shop.promoBanner && (
            <div className="mt-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-3 py-1.5 flex items-center gap-2 w-fit">
              <Sparkles size={10} className="text-sky-400" fill="currentColor" />
              <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{shop.promoBanner}</span>
            </div>
          )}
        </div>

        {!isOpen && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-6 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white font-black text-[10px] uppercase tracking-[0.3em]">Shop is Closed</span>
          </div>
        )}

        {/* Sponsored badge on card */}
        {shop.isSponsored && (
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-sky-900/40 border border-white/20">
              <Sparkles size={9} fill="currentColor" />
              Sponsored
            </div>
          </div>
        )}

        {/* ⭐ Floating Rating Badge (Only show if real ratings exist) */}
        {Number(shop.totalOrders) > 0 && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20 animate-in fade-in zoom-in duration-500">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-black text-slate-900 tracking-tight">
              {Number(shop.rating).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Shop Details */}
      <div className="p-6 flex items-center justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-sky-600 transition-colors uppercase">{shop.name}</h3>
            <div className="flex items-center gap-2 mb-1">
              <ReviewStars rating={shop.rating || 0} size={10} />
              {Number(shop.totalOrders) > 0 && (
                <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded tracking-tighter">
                  {Number(shop.rating).toFixed(1)} ({shop.totalOrders})
                </span>
              )}
            </div>
            {shop.matchedProducts?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                  <Search size={8} /> Matched: {shop.matchedProducts[0]}{shop.matchedProducts.length > 1 ? ` +${shop.matchedProducts.length - 1}` : ''}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
            {shop.distance !== null && shop.distance !== undefined && (
              <>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-100/50 shadow-sm transition-transform group-hover:scale-105 shrink-0">
                  <MapPin size={10} strokeWidth={3} className="text-sky-500" />
                  <span className="text-[10px] font-black tracking-widest">{shop.distance} KM</span>
                </div>
                <span className={`italic transition-colors whitespace-nowrap ${shop.distance <= 5 ? 'text-sky-500 font-black' : 'text-rose-500'}`}>
                  • {shop.distance <= (shop.deliveryRadius || 5) ? 'IN DELIVERY RANGE' : 'TOO FAR FOR DELIVERY'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 group-hover:bg-sky-50 group-hover:text-sky-500 transition-all shrink-0 ml-3">
          <ChevronRight size={24} strokeWidth={3} />
        </div>
      </div>

    </div>
  );
};
