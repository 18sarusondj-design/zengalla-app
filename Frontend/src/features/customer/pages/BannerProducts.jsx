import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { ChevronLeft, ShoppingBag, Plus, Minus, Loader2, ArrowRight, ShoppingCart, Trash2, Sparkles, Star, AlertCircle } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import SEO from '../../common/components/SEO';
import ProductDetailsModal from '../components/ProductDetailsModal';
import CustomerWeightModal from '../components/CustomerWeightModal';

const BannerProducts = () => {
  const { shopId, bannerId } = useParams();
  const navigate = useNavigate();

  const [banner, setBanner] = useState(null);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal details
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weighingProduct, setWeighingProduct] = useState(null);

  const { cart: allCarts, addToCart, removeFromCart, updateQuantity, setItemQuantity, cartTotal, setCurrentShopId } = useStore();
  const cart = allCarts[shopId] || [];
  const { user } = useAuth();

  const isOwner = user?.role === 'vendor' && user?.email === shop?.vendorEmail;

  const fetchBannerDetails = async () => {
    setLoading(true);
    try {
      if (!bannerId) return;
      const [bannerRes, shopRes] = await Promise.all([
        api.get(`/banners/${bannerId}`),
        api.get(`/shops/${shopId}`)
      ]);

      if (bannerRes.data?.success) {
        const b = bannerRes.data.banner;
        setBanner(b);
        // Products populated by backend
        setProducts(b.products || []);
      }
      if (shopRes.data?.success) {
        setShop(shopRes.data.shop);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load promotional offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannerDetails();
    if (shopId) {
      setCurrentShopId(shopId);
    }
  }, [shopId, bannerId]);

  const isExpired = () => {
    if (!banner) return false;
    return new Date(banner.endDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Offers...</p>
      </div>
    );
  }

  if (!banner || isExpired() || !banner.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 rounded-[36px] flex items-center justify-center text-rose-500">
          <AlertCircle size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Offer Ended!</h2>
          <p className="text-xs font-bold text-gray-400 max-w-sm mx-auto leading-relaxed">
            This promotional event is either expired, paused, or no longer available. Check out other live store offers!
          </p>
        </div>
        <button
          onClick={() => navigate(`/shop/${shopId}`)}
          className="h-12 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center gap-2"
        >
          <ChevronLeft size={16} strokeWidth={3} />
          <span>Back to Store</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <SEO 
        title={`${banner.title} | ZenGalla Offers`} 
        description={banner.subtitle || 'Exclusive deals and discount events'} 
      />

      {/* Header Cover Banner */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden bg-gradient-to-r from-gray-900 via-sky-950 to-indigo-900 text-white flex items-center justify-start">
        {banner.image ? (
          <>
            <img 
              src={banner.image} 
              alt={banner.title} 
              className="absolute inset-0 w-full h-full object-cover opacity-85" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 via-indigo-900 to-black" />
        )}

        {/* Back navigation button overlay */}
        <button
          onClick={() => navigate(`/shop/${shopId}`)}
          className="absolute top-6 left-6 z-20 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-2xl backdrop-blur-md flex items-center justify-center transition-all active:scale-90 shadow-lg border border-white/10"
          title="Back to Store"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        <div className="relative z-10 px-8 md:px-20 py-8 max-w-3xl space-y-3">
          <span className="inline-block px-3.5 py-1.5 bg-sky-500/90 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
            {banner.type}
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none uppercase drop-shadow-md">
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="text-sm md:text-base font-semibold text-gray-200 line-clamp-2 drop-shadow max-w-2xl leading-relaxed text-left">
              {banner.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Products Grid Content */}
      <div className="mt-8 px-6 space-y-6 w-full max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.25em]">Promotional Items</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Exclusive discounts applied for this banner event only.</p>
          </div>
          <span className="text-[10px] font-black text-sky-500 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full uppercase tracking-widest">
            {products.length} Items Available
          </span>
        </div>

        {products.length === 0 ? (
          <div className="py-24 bg-white rounded-[32px] border border-dashed text-center flex flex-col items-center gap-6 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-gray-50 rounded-[36px] flex items-center justify-center text-gray-300">
              <ShoppingBag size={36} strokeWidth={1.5} />
            </div>
            <div className="space-y-1 px-4">
              <h3 className="text-gray-900 font-black text-base uppercase tracking-tight">No Active Products</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">
                Products linked to this banner are currently out of stock or have been unlinked.
              </p>
            </div>
            <button 
              onClick={() => navigate(`/shop/${shopId}`)}
              className="px-6 h-12 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-100 transition-all active:scale-95"
            >
              Browse Shop Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
            {products.map(product => {
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
                    {/* Product Image Panel */}
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

                      {/* Cover overlay for text visibility */}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {discount > 0 && !outOfStock && (
                          <span className="bg-sky-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                            {discount}% OFF
                          </span>
                        )}
                        {outOfStock && (
                          <span className="bg-rose-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                            Sold Out
                          </span>
                        )}
                      </div>

                      {/* ⭐ Rating Highlight */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-white/20">
                        <Star size={10} className="text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-slate-900 leading-none">
                          {Number(product.rating || 0).toFixed(1)}
                        </span>
                      </div>

                      {/* Price Overlay */}
                      <div className="absolute bottom-3 left-3 flex flex-col pointer-events-none">
                        {product.mrp > currentPrice && (
                          <span className="text-[9px] line-through text-white/60 font-bold leading-none mb-0.5">
                            ₹{product.mrp}
                          </span>
                        )}
                        <span className="text-2xl font-black text-white tracking-tighter leading-none drop-shadow-lg">
                          ₹{Math.round(currentPrice || product.mrp)}
                        </span>
                      </div>
                    </div>

                    {/* Card Body Information */}
                    <div className="p-3 flex flex-col gap-2.5">
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-tight text-gray-900 leading-none mb-3">
                          {product.name}
                        </h4>

                        {/* Stock Left */}
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
                                  {inCart.quantity.toFixed(2)} KG
                                </button>
                              ) : (
                                <div className="flex-1 flex items-center bg-sky-600 rounded-xl p-0.5 gap-1 h-8">
                                  <button
                                    onClick={() => updateQuantity(productId, -1, shopId)}
                                    className="flex-1 h-full flex items-center justify-center text-white hover:text-sky-400 transition-all active:scale-75 font-black text-base disabled:opacity-50"
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
                            </div>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 inset-x-6 z-50 max-w-[500px] mx-auto bg-gray-900 text-white p-4 rounded-[28px] shadow-2xl border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-12 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white">
              <ShoppingBag size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Your Shop Cart</p>
              <h4 className="text-sm font-black text-white leading-none">
                {cart.length} Items | ₹{cartTotal(shopId)}
              </h4>
            </div>
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="h-10 px-5 bg-white text-gray-900 hover:bg-sky-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Checkout</span>
            <ArrowRight size={12} strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Product Details Modal popup */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          shop={shop}
        />
      )}

      {/* Customer Weight modal popup */}
      {weighingProduct && (
        <CustomerWeightModal
          product={weighingProduct}
          onClose={() => setWeighingProduct(null)}
          shopId={shopId}
        />
      )}
    </div>
  );
};

export default BannerProducts;
