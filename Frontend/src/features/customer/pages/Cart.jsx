import React from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, X, Tag, Ticket, Sparkles, CheckCircle2, Store, ChevronRight, ShoppingCart, Gift, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CustomerWeightModal from '../components/CustomerWeightModal';
import Logo from '../../common/components/Logo';
import SEO from '../../common/components/SEO';


const Cart = () => {
  const {
    updateQuantity, removeFromCart, clearCart,
    setItemQuantity, cart: allCarts, setCurrentShopId,
    shops, user: storeUser, fetchShops
  } = useStore();
  const { user: authUser } = useAuth();
  const user = authUser || storeUser;
  const navigate = useNavigate();
  const [weighingProduct, setWeighingProduct] = React.useState(null);

  React.useEffect(() => {
    fetchShops();
  }, [fetchShops]);
  
  // Track discounts/coupons per shop
  const [shopDiscounts, setShopDiscounts] = React.useState({});
  const [shopCoupons, setShopCoupons] = React.useState({});
  // Track which shop's coupon drawer is open
  const [openCouponDrawer, setOpenCouponDrawer] = React.useState(null);

  // Lock body scroll when drawer is open (works on iOS too)
  React.useEffect(() => {
    if (openCouponDrawer) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (top) window.scrollTo(0, -parseInt(top || '0'));
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [openCouponDrawer]);

  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const isShopOpen = (s) => {
    if (!s) return false;
    const active = s.isActive ?? s.is_active ?? s.is_Active ?? true;
    if (active === false) return false;
    if (!s.operatingHours?.enabled) return true;
    
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = (s.operatingHours.start || '00:00').split(':').map(Number);
    const [eH, eM] = (s.operatingHours.end || '23:59').split(':').map(Number);
    return current >= (sH * 60 + sM) && current <= (eH * 60 + eM);
  };

  const nonEmptyCarts = Object.entries(allCarts || {}).filter(([_, items]) => items && items.length > 0);

  const handleApplyCoupon = (shopId, code) => {
    const targetShop = shops.find(s => s._id === shopId);
    if (!targetShop) return;

    const targetCode = code.toUpperCase().trim();
    if (!targetCode) { toast.error("Enter a coupon code"); return; }
    const cartItems = allCarts[shopId] || [];
    
    const subtotal = cartItems.reduce((sum, item) => {
      const isB2B = targetShop.isWholesale && user?.phone && targetShop.b2bPartners?.some(p => p.phone === user.phone);
      const price = (targetShop.isWholesale && item.product?.wholesalePrice > 0 && (item.quantity >= (item.product?.minimumOrderQuantity || 1) || isB2B)) 
        ? item.product.wholesalePrice 
        : (item.product?.price || 0);
      return sum + (price * item.quantity);
    }, 0);

    const shopCoupon = (targetShop.coupons || []).find(c => c.code.toUpperCase() === targetCode && c.isActive);

    if (shopCoupon) {
      if (shopCoupon.expiryDate && new Date(shopCoupon.expiryDate) < new Date()) {
        toast.error("This coupon has expired");
        return;
      }
      if (subtotal < (shopCoupon.minOrderAmount || 0)) {
        toast.error(`Min order of ₹${shopCoupon.minOrderAmount} required`);
        return;
      }
      const amount = shopCoupon.discountType === 'percentage'
        ? Math.round(subtotal * (shopCoupon.discountValue / 100))
        : shopCoupon.discountValue;

      setShopDiscounts(prev => ({ ...prev, [shopId]: amount }));
      setShopCoupons(prev => ({ ...prev, [shopId]: targetCode }));
      toast.success(`🎉 Coupon applied! You save ₹${amount}`);
      return;
    }

    if (targetCode === 'SAVE10') {
      const amount = Math.round(subtotal * 0.1);
      setShopDiscounts(prev => ({ ...prev, [shopId]: amount }));
      setShopCoupons(prev => ({ ...prev, [shopId]: targetCode }));
      toast.success(`🎉 Coupon applied! You save ₹${amount}`);
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const handleRemoveCoupon = (shopId) => {
    setShopDiscounts(prev => { const n = {...prev}; delete n[shopId]; return n; });
    setShopCoupons(prev => { const n = {...prev}; delete n[shopId]; return n; });
    toast.info("Coupon removed");
  };

  const handleCheckout = (shopId) => {
    setCurrentShopId(shopId);
    const discount = shopDiscounts[shopId] || 0;
    const coupon = shopCoupons[shopId] || null;

    if (!user) {
      toast.info("Please login to proceed to checkout");
      sessionStorage.setItem('redirectUrl', '/checkout');
      sessionStorage.setItem('checkout_discount', String(discount));
      sessionStorage.setItem('checkout_couponCode', coupon || '');
      navigate('/login', { state: { from: '/checkout', discount, couponCode: coupon } });
      return;
    }
    navigate('/checkout', { state: { discount, couponCode: coupon } });
  };

  if (nonEmptyCarts.length === 0) {
    return (
      <div className="flex flex-col min-h-screen font-sans bg-gray-50">
        <div className="relative overflow-hidden shrink-0 px-5 pt-8 pb-16" style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
          <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/3 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/10 transition-all">
              <X size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">Shopping Hub</h1>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">0 Active Carts</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-sky-100 to-rose-100 border border-sky-100 rounded-[32px] flex items-center justify-center text-sky-400 shadow-lg shadow-sky-50">
            <ShoppingCart size={40} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Cart is Empty</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[220px] mx-auto">
              Explore local shops and add your favourite items.
            </p>
          </div>
          <Link to="/shops" className="inline-flex items-center gap-2 bg-gray-900 hover:bg-sky-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all duration-300 active:scale-95 group">
            Discover Shops <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans w-full pb-24">
      <SEO 
        title="My Shopping Cart" 
        description="Review your items and proceed to checkout for fast delivery."
        canonical="/cart"
      />

      {/* Premium Header */}
      <div className="sticky top-0 z-[100] shadow-2xl" style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/3 rounded-full translate-y-1/2" />
        </div>
        <div className="relative px-5 pt-6 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/10 transition-all active:scale-90"
            >
              <X size={18} />
            </button>

            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">Shopping Hub</h1>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5">{nonEmptyCarts.length} Active Cart{nonEmptyCarts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-900/30">
              <ShoppingCart size={16} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        {nonEmptyCarts.map(([shopId, items]) => {
          const shop = shops.find(s => s._id === shopId);
          if (!shop) return null;

          const isB2B = shop.isWholesale && user?.phone && shop.b2bPartners?.some(p => p.phone === user.phone);
          const subtotal = items.reduce((sum, item) => {
            const price = (shop.isWholesale && item.product?.wholesalePrice > 0 && (item.quantity >= (item.product?.minimumOrderQuantity || 1) || isB2B)) 
              ? item.product.wholesalePrice 
              : (item.product?.price || 0);
            return sum + (price * item.quantity);
          }, 0);
          const discount = shopDiscounts[shopId] || 0;
          const coupon = shopCoupons[shopId] || '';
          const appliedCoupon = shopDiscounts[shopId] ? shopCoupons[shopId] : null;
          const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
          const activeCoupons = (shop.coupons || []).filter(c => {
            if (!c.isActive) return false;
            if (c.expiryDate && new Date(c.expiryDate) < new Date()) return false;
            return true;
          });

          return (
            <div key={shopId} className="bg-white rounded-[28px] shadow-xl shadow-gray-200/60 border border-gray-100/80 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Shop Header */}
              <div className="relative overflow-hidden px-6 py-4" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky-500/10 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Logo variant="icon" className="w-11 h-11 rounded-2xl shadow-lg shadow-sky-900/40 shrink-0" />
                    <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tight leading-none">{shop.name}</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isShopOpen(shop) ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isShopOpen(shop) ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isShopOpen(shop) ? 'Active Now' : `Closed (Opens ${fmtTime(shop.operatingHours?.start || '09:00')})`}
                        </span>
                        {shop.operatingHours?.enabled && (
                          <>
                            <span className="text-white/20 mx-1">•</span>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                              {shop.operatingHours.start} - {shop.operatingHours.end}
                            </span>
                          </>
                        )}
                        <span className="text-white/20 mx-1">•</span>
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/shop/${shopId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Add More <ChevronRight size={10} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => {
                        toast.error(`Clear ${shop.name} cart?`, {
                          description: "All items in this shop's cart will be removed.",
                          action: {
                            label: "Clear",
                            onClick: () => {
                              clearCart(shopId);
                              toast.success(`Cleared ${shop.name} cart`);
                            }
                          }
                        });
                      }}
                      aria-label={`Clear ${shop.name} cart`}
                      className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-rose-500/30 text-white/50 hover:text-rose-400 rounded-xl border border-white/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>

                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col lg:flex-row gap-6">

                {/* Items List */}
                <div className="flex-1 space-y-3">
                  {items.map((item, idx) => {
                    const pid = item.product?._id || item.product?.id;
                    const price = (shop.isWholesale && item.product?.wholesalePrice > 0 && (item.quantity >= (item.product?.minimumOrderQuantity || 1) || isB2B)) 
                      ? item.product.wholesalePrice 
                      : (item.product?.price || 0);
                    const lineTotal = Math.round(price * item.quantity);
                    const isWeight = item.product?.sellingType === 'weight';

                    return (
                      <div key={pid || idx} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-gray-100">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                          <img
                            src={item.product?.image || item.product?.imageUrl || null}
                            alt={item.product?.name || ''}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'; }}
                          />
                        </div>

                        {/* Name & Meta */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-gray-900 uppercase tracking-tight truncate leading-tight">{item.product?.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {isWeight ? `${parseFloat(Number(item.quantity).toFixed(3))} KG` : `${parseFloat(Number(item.quantity).toFixed(3))} ${item.product?.unit || 'pc'}`}
                            <span className="mx-1.5 text-gray-300">·</span>
                            ₹{price}/{isWeight ? 'kg' : 'pc'}
                          </p>
                        </div>

                        {/* Quantity + Price */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(pid, -1, shopId)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                            >
                              <Minus size={11} strokeWidth={3} />
                            </button>
                            <span className="text-xs font-black text-gray-900 min-w-[20px] text-center">{parseFloat(Number(item.quantity).toFixed(3))}</span>
                            <button
                              onClick={() => updateQuantity(pid, 1, shopId)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-sky-500 hover:text-white transition-all active:scale-90"
                            >
                              <Plus size={11} strokeWidth={3} />
                            </button>
                          </div>

                          <div className="text-right w-16">
                            <p className="font-black text-sm text-gray-900 tracking-tight">₹{lineTotal}</p>
                            <button
                              onClick={() => {
                                toast.error(`Remove ${item.product?.name}?`, {
                                  action: {
                                    label: "Remove",
                                    onClick: () => {
                                      removeFromCart(pid, shopId);
                                      toast.success("Item removed");
                                    }
                                  }
                                });
                              }}
                              className="text-[9px] font-black text-gray-300 hover:text-rose-500 uppercase tracking-widest transition-colors mt-0.5"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Summary Panel */}
                <div className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4">
                  
                  {/* Price Breakdown */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Order Summary</p>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <span>Subtotal</span>
                        <span className="text-gray-800 font-black">₹{subtotal}</span>
                      </div>
                      
                      {discount > 0 && (
                        <div className="flex justify-between text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Sparkles size={10} />Coupon
                          </span>
                          <span>−₹{discount}</span>
                        </div>
                      )}

                      {shop.platformFee > 0 && (
                        <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          <span>Platform Fee</span>
                          <span className="text-gray-800 font-black">₹{shop.platformFee}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Total</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-gray-900 tracking-tighter">₹{subtotal - discount + (shop.platformFee || 0)}</span>
                          {discount > 0 && (
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">You save ₹{discount}!</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Ticket size={13} className="text-sky-500" />
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Coupon Code</p>
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{appliedCoupon}</p>
                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Applied · −₹{discount}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCoupon(shopId)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-100 hover:bg-rose-100 text-emerald-500 hover:text-rose-500 transition-all"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Input Row */}
                        <div className="relative">
                          <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input
                            type="text"
                            placeholder="Enter or select code below"
                            value={coupon}
                            onChange={(e) => setShopCoupons(prev => ({ ...prev, [shopId]: e.target.value.toUpperCase() }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon(shopId, coupon)}
                            className="w-full h-11 bg-white rounded-xl pl-9 pr-20 text-[10px] font-black uppercase tracking-widest border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all outline-none"
                          />
                          <button
                            onClick={() => handleApplyCoupon(shopId, coupon)}
                            className="absolute right-1.5 top-1.5 h-8 px-3.5 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-sky-500 transition-all"
                          >
                            Apply
                          </button>
                        </div>

                        {/* Add Coupon Button - Always visible to show redesigned drawer/empty state */}
                        <button
                          onClick={() => setOpenCouponDrawer(shopId)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-dashed border-sky-200 hover:border-sky-400 hover:bg-sky-50 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <Gift size={15} className="text-sky-500" />
                            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">View Available Coupons</span>
                          </div>
                          <span className="text-[9px] font-black text-sky-400 bg-sky-100 px-2 py-0.5 rounded-full">{activeCoupons.length}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Checkout Button - Enabled even if closed as per user request */}
                  <button
                    onClick={() => handleCheckout(shopId)}
                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-lg group ${
                      isShopOpen(shop)
                        ? 'bg-gradient-to-r from-sky-500 via-sky-500 to-rose-500 text-white shadow-sky-200 hover:shadow-sky-300 hover:shadow-xl'
                        : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'
                    }`}
                  >
                    {isShopOpen(shop) ? (
                      <>
                        Checkout Shop
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        Place Pre-Order
                        <Clock size={16} className="group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                  {!isShopOpen(shop) && (
                    <p className="text-[8px] font-bold text-amber-600 uppercase text-center tracking-widest leading-tight">
                      Store is currently closed. Vendor will contact you to confirm this order.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CustomerWeightModal
        isOpen={!!weighingProduct}
        onClose={() => setWeighingProduct(null)}
        product={weighingProduct}
        onConfirm={(p, qty) => setItemQuantity(p, qty)}
      />

      {/* Coupon Drawer Overlay */}
      {openCouponDrawer && (() => {
        const drawerShopId = openCouponDrawer;
        const drawerShop = shops.find(s => s._id === drawerShopId);
        const drawerItems = allCarts[drawerShopId] || [];
        const drawerIsB2B = drawerShop?.isWholesale && user?.phone && drawerShop?.b2bPartners?.some(p => p.phone === user.phone);
        const drawerSubtotal = drawerItems.reduce((sum, item) => {
          const price = (drawerShop?.isWholesale && item.product?.wholesalePrice > 0 && (item.quantity >= (item.product?.minimumOrderQuantity || 1) || drawerIsB2B))
            ? item.product.wholesalePrice
            : (item.product?.price || 0);
          return sum + (price * item.quantity);
        }, 0);
        const drawerCoupons = (drawerShop?.coupons || []).filter(c => {
          if (!c.isActive) return false;
          if (c.expiryDate && new Date(c.expiryDate) < new Date()) return false;
          return true;
        });

        return (
          <>
            {/* Backdrop — blocks all touch/scroll events */}
            <div
              className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm"
              onClick={() => setOpenCouponDrawer(null)}
              onTouchMove={(e) => e.preventDefault()}
              style={{ touchAction: 'none' }}
            />
            {/* Drawer */}
            <div
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[201] bg-white rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-hidden flex flex-col"
              onTouchMove={(e) => e.stopPropagation()}
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Header with Premium Gradient */}
              <div className="relative overflow-hidden pt-8 pb-6 px-6">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-sky-500 to-indigo-600 opacity-95" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-400/20 rounded-full blur-xl -ml-12 -mb-12" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                      <Gift size={24} className="text-white animate-bounce-slow" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Available Coupons</h3>
                      <p className="text-[10px] font-black text-sky-100/60 uppercase tracking-[0.2em] mt-1.5">{drawerShop?.name} • {drawerCoupons.length} Exclusive Offer{drawerCoupons.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenCouponDrawer(null)}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20 transition-all backdrop-blur-md active:scale-90"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Coupon List */}
              <div className="overflow-y-auto flex-1 px-6 py-6 space-y-4 custom-scrollbar-visible">
                {drawerCoupons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                      <Ticket size={32} className="text-slate-300 rotate-12" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">No Active Offers</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[200px]">Check back later for new savings and promotions.</p>
                  </div>
                ) : (
                  drawerCoupons.map(c => {
                    const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                    const meetsMin = !isExpired && drawerSubtotal >= (c.minOrderAmount || 0);
                    const savings = c.discountType === 'percentage'
                      ? Math.round(drawerSubtotal * (c.discountValue / 100))
                      : c.discountValue;
                    const stillNeeds = (c.minOrderAmount || 0) - drawerSubtotal;

                    return (
                      <div
                        key={c.code}
                        className={`group rounded-[32px] border-2 transition-all duration-300 overflow-hidden relative ${
                          meetsMin 
                            ? 'border-sky-100 bg-white shadow-lg shadow-sky-500/5 hover:border-sky-300' 
                            : 'border-slate-100 bg-slate-50/50 grayscale opacity-70'
                        }`}
                      >
                        {/* Status Badge */}
                        <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          isExpired ? 'bg-rose-100 text-rose-600' : (meetsMin ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500')
                        }`}>
                          {isExpired ? 'Expired' : (meetsMin ? 'Eligible' : 'Locked')}
                        </div>

                        <div className="p-5 flex items-start gap-4">
                          {/* Ticket Visual */}
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                            meetsMin ? 'bg-sky-50 border-sky-100 text-sky-600 group-hover:scale-110' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            <Ticket size={24} strokeWidth={2.5} />
                          </div>

                          <div className="flex-1 min-w-0 pr-12">
                            <h4 className={`text-lg font-black uppercase tracking-tighter leading-none ${
                              isExpired ? 'text-slate-400' : (meetsMin ? 'text-gray-900' : 'text-slate-500')
                            }`}>{c.code}</h4>
                            
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                meetsMin ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                              </span>
                              {c.minOrderAmount > 0 && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min. ₹{c.minOrderAmount}</span>
                              )}
                            </div>
                            
                            {!meetsMin && (
                              <div className="mt-3 flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-sky-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (drawerSubtotal / c.minOrderAmount) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest shrink-0">Add ₹{stillNeeds}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (isExpired) {
                              toast.error("This coupon has expired");
                              return;
                            }
                            if (!meetsMin) {
                              toast.info(`Add ₹${stillNeeds} more to use this coupon!`);
                              return;
                            }
                            setShopCoupons(prev => ({ ...prev, [drawerShopId]: c.code }));
                            handleApplyCoupon(drawerShopId, c.code);
                            setOpenCouponDrawer(null);
                          }}
                          className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-t ${
                            isExpired
                              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100'
                              : (meetsMin
                                ? 'bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border-sky-100'
                                : 'bg-white text-slate-300 cursor-not-allowed border-slate-100')
                          }`}
                        >
                          {isExpired ? 'Offer Expired' : (meetsMin ? 'Apply Coupon Now' : `Need ₹${stillNeeds} more`)}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default Cart;
