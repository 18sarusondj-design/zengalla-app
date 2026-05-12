import React from 'react';
import { X, Ticket, Sparkles, Clock, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PromoModal = ({ isOpen, onClose, shop }) => {
  if (!isOpen || !shop) return null;

  const activeCoupons = (shop.coupons || []).filter(c => {
    if (!c.isActive) return false;
    if (c.expiryDate && new Date(c.expiryDate) < new Date()) return false;
    return true;
  });

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied!`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="relative bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image/Background */}
        <div className="h-32 bg-sky-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-[22px] flex items-center justify-center text-white border border-white/30 shadow-xl">
              <Sparkles size={32} fill="currentColor" />
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/20"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Shop Offers</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{shop.name}</p>
          </div>

          <div className="space-y-4">
            {/* Promo Banner Info */}
            {shop.promoBanner && (
              <div className="bg-sky-50 border border-sky-100 rounded-3xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-200">
                  <Sparkles size={20} fill="currentColor" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Featured Offer</p>
                  <h3 className="text-sm font-black text-sky-900 uppercase leading-snug">{shop.promoBanner}</h3>
                </div>
              </div>
            )}

            {/* Coupons List */}
            <div className="pt-2">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 ml-2">Available Coupons</h4>
              
              {activeCoupons.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100">
                  <Ticket size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No coupon codes active</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCoupons.map((coupon, idx) => (
                    <div key={idx} className="group relative bg-white border border-gray-100 rounded-[28px] p-4 flex items-center justify-between hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/5 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-sky-50 group-hover:text-sky-500 transition-colors">
                          <Ticket size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{coupon.code}</span>
                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Min. order ₹{coupon.minOrderAmount}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(coupon.code)}
                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-sky-500 hover:text-white transition-all active:scale-90"
                        title="Copy Code"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-8 py-4 bg-gray-900 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] shadow-xl hover:shadow-gray-900/20 active:scale-95 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoModal;
