import React, { useState, useEffect, memo, useCallback } from 'react';
import { Sparkles, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight, Star, Play } from 'lucide-react';

const FeaturedCarousel = memo(({ featuredShops, navigate }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (featuredShops.length <= 1) return;

    const timer = setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % featuredShops.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeSlide, featuredShops.length]);

  const goToSlide = useCallback((idx) => {
    setActiveSlide(idx);
  }, []);

  const fmtTime = useCallback((t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }, []);

  const isShopOpen = useCallback((s) => {
    if (!s) return false;
    const active = s.isActive ?? s.is_active ?? true;
    if (active === false) return false;
    if (!s.operatingHours?.enabled) return true;
    
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = (s.operatingHours.start || '00:00').split(':').map(Number);
    const [eH, eM] = (s.operatingHours.end || '23:59').split(':').map(Number);
    return current >= (sH * 60 + sM) && current <= (eH * 60 + eM);
  }, []);

  if (featuredShops.length === 0) return null;

  return (
    <div className="px-5 pt-6 pb-2 animate-in fade-in duration-700">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-full">
          <Sparkles size={11} className="text-sky-500" fill="currentColor" />
          <span className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">Featured Shops</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-sky-200 dark:from-sky-800 to-transparent" />
      </div>

      {/* Cinematic Banner */}
      <div className="relative rounded-[28px] overflow-hidden shadow-2xl shadow-sky-900/20 border border-sky-200/30 dark:border-slate-800 h-56 md:h-72 bg-gray-900">
        {featuredShops.map((shop, idx) => (
          <div
            key={shop._id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div
              onClick={() => navigate(`/shop/${shop._id}`)}
              className="relative w-full h-full cursor-pointer group"
            >
              {/* Background Image */}
              <img
                src={shop.bannerUrl || shop.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200'}
                alt={shop.name}
                referrerPolicy="no-referrer"
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "low"}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"

                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200';
                }}
              />

              {/* Cinematic gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

              {/* Sponsored badge */}
              <div className="absolute top-3 md:top-4 left-3 md:left-4 z-10">
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-sky-500 text-white rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                  <Sparkles size={8} className="md:w-[9px] md:h-[9px]" fill="currentColor" />
                  Ad · Sponsored
                </div>
              </div>

              {/* Open/Close badge */}
              <div className="absolute top-3 md:top-4 right-3 md:right-4 z-10">
                <div
                  className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest shadow-sm ${
                    isShopOpen(shop) ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {isShopOpen(shop) ? 'Open' : 'Closed'}
                </div>
              </div>

              {/* ⭐ Floating Rating Badge */}
              {Number(shop.ratingCount || 0) > 0 && (
                <div className="absolute top-3 md:top-4 right-14 md:right-20 z-10">
                  <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-white/20">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-slate-900">
                      {shop.dynamicRating || shop.rating || '0.0'}
                    </span>
                  </div>
                </div>
              )}

              {/* Shop Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10">
                <h2 className="text-lg md:text-3xl font-black text-white uppercase tracking-tight leading-none mb-1 drop-shadow-lg max-w-[80%]">
                  {shop.name}
                </h2>

                {shop.promoBanner && (
                  <div className="mt-1 md:mt-2 mb-2 md:mb-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg md:rounded-xl px-2.5 md:px-4 py-1 md:py-2 flex items-center gap-2 md:gap-3 w-fit max-w-[85%]">
                    <div className="w-4 h-4 md:w-6 md:h-6 bg-sky-500 rounded-md md:rounded-lg flex items-center justify-center text-white shrink-0">
                      <Sparkles size={10} className="md:w-3 md:h-3" fill="currentColor" />
                    </div>
                    <span className="text-[7.5px] md:text-[10px] font-black text-white uppercase tracking-widest leading-tight">
                      {shop.promoBanner}
                    </span>
                  </div>
                )}

                {/* CTA and Distance */}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-lg transition-all group-hover:gap-3">
                    Visit Store <ArrowRight size={12} strokeWidth={3} />
                  </div>

                  {shop.distance !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-lg md:rounded-xl border border-white/10 text-white">
                      <MapPin size={10} className="text-sky-400" />
                      <span className="text-[10px] md:text-[12px] font-black">{shop.distance} KM</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Dot indicators */}
        {featuredShops.length > 1 && (
          <div className="absolute bottom-4 right-5 flex items-center gap-1.5 z-20">
            {featuredShops.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                className={`rounded-full transition-all duration-300 ${
                  idx === activeSlide ? 'w-5 h-2 bg-sky-500' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />

            ))}
          </div>
        )}
      </div>
    </div>
  );
});

FeaturedCarousel.displayName = 'FeaturedCarousel';

export default FeaturedCarousel;
