import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_BANNERS = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200&h=400',
    title: 'Fresh Organic Produce',
    subtitle: 'Up to 20% off on all vegetables today!',
    linkType: 'category',
    linkUrl: 'Vegetables'
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=1200&h=400',
    title: 'Daily Essentials',
    subtitle: 'Stock up your pantry with best deals.',
    linkType: 'custom',
    linkUrl: '/offers'
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1200&h=400',
    title: 'Premium Spices',
    subtitle: 'Discover the rich flavors of India.',
    linkType: 'store',
    linkUrl: '/store/premium-spices'
  }
];

const BannerCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate fetching banners
    const fetchBanners = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
      setBanners(MOCK_BANNERS);
      setLoading(false);
    };
    fetchBanners();
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === banners.length - 1 ? 0 : prevIndex + 1));
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? banners.length - 1 : prevIndex - 1));
  }, [banners.length]);

  useEffect(() => {
    if (loading || banners.length <= 1 || isPaused) return;
    
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, banners.length, isPaused, nextSlide]);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();

    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleBannerClick = (banner) => {
    if (!banner.linkUrl) return;
    
    // Simulate routing based on linkType
    switch (banner.linkType) {
      case 'product':
        // Navigate to product modal or page (handled by parent usually, but we simulate custom URL)
        console.log(`Opening product ${banner.linkUrl}`);
        break;
      case 'category':
        console.log(`Filtering by category ${banner.linkUrl}`);
        break;
      case 'store':
        console.log(`Opening store ${banner.linkUrl}`);
        break;
      default:
        navigate(banner.linkUrl);
        break;
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 pt-4 mb-2">
        <div className="w-full aspect-[21/9] md:aspect-[21/7] lg:aspect-[21/6] bg-gray-200 dark:bg-slate-800 animate-pulse rounded-2xl md:rounded-3xl"></div>
      </div>
    );
  }

  if (!banners.length) return null;

  return (
    <div className="w-full px-4 pt-4 mb-2 relative group"
         onMouseEnter={() => setIsPaused(true)}
         onMouseLeave={() => setIsPaused(false)}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full aspect-[21/9] md:aspect-[21/7] lg:aspect-[21/6] rounded-2xl md:rounded-3xl overflow-hidden shadow-md border border-gray-100 dark:border-slate-800 cursor-pointer">
        {/* Slides Container */}
        <div 
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner) => (
            <div 
              key={banner.id} 
              className="min-w-full h-full relative"
              onClick={() => handleBannerClick(banner)}
            >
              <img 
                src={banner.imageUrl} 
                alt={banner.title} 
                className="w-full h-full object-cover select-none"
                draggable="false"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/1200x400/1e293b/ffffff?text=Offer+Banner';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center px-6 md:px-12 text-white">
                <h2 className="text-lg md:text-2xl lg:text-3xl font-black uppercase tracking-widest drop-shadow-lg leading-tight mb-1 md:mb-2 max-w-[70%]">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="text-xs md:text-sm lg:text-base font-medium text-gray-200 drop-shadow-md max-w-[60%]">
                    {banner.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white/30 hover:bg-white/90 dark:bg-black/30 dark:hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white/30 hover:bg-white/90 dark:bg-black/30 dark:hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
              aria-label="Next slide"
            >
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={`transition-all duration-300 rounded-full ${
                  currentIndex === index 
                    ? 'w-4 md:w-6 h-1.5 md:h-2 bg-sky-500' 
                    : 'w-1.5 md:w-2 h-1.5 md:h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerCarousel;
