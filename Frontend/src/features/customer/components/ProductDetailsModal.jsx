import React, { useState, useRef } from 'react';
import { X, ShoppingBag, ShoppingCart, ArrowRight, Trash2, Package, Tag, Layers, AlertCircle, CheckCircle2, Scale, TrendingUp, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useStore } from '../../shop/context/StoreContext';
import { toast } from 'sonner';
import ProductReviews from './ProductReviews';

const ProductDetailsModal = ({ isOpen, onClose, product, cartItem, addToCart, updateQuantity, removeFromCart }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteProduct, shops } = useStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchX = useRef(0);
  
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const shop = shops.find(s => s._id === product.shopId || s._id === product.shop);
  const isOwner = user?.role === 'vendor' && user?.email === shop?.vendorEmail;

  const inStock = Number(product.stockQuantity || product.stock || 0) > 0;
  const productId = product._id || product.id;
  const isFresh = product.createdAt && (new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24) <= 6;
  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const isWholesaleApplied = shop?.isWholesale && product.wholesalePrice > 0 && (cartItem?.quantity || 0) >= (product.minimumOrderQuantity || 1);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-sm overflow-hidden shadow-2xl sm:rounded-[36px] rounded-t-[36px] flex flex-col max-h-[92vh]">

        {/* Hero Image / Gallery Slider */}
        <div className="relative h-64 overflow-hidden bg-gray-100 shrink-0 group">
          <div 
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const delta = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(delta) > 50) {
                if (delta > 0 && activeImageIndex > 0) setActiveImageIndex(prev => prev - 1);
                else if (delta < 0 && activeImageIndex < (product.images?.length || 1) - 1) setActiveImageIndex(prev => prev + 1);
              }
            }}
          >
            {(product.images?.length > 0 ? product.images : [product.image || product.imageUrl]).map((img, idx) => {
              const settings = product.imageSettings?.[idx] || { position: 'center', zoom: 100 };
              return (
                <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden">
                  <img
                    src={img || 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-all duration-700 ${!inStock ? 'grayscale-[0.6]' : ''}`}
                    style={{ 
                      objectPosition: settings.position,
                      transform: `scale(${settings.zoom / 100})`,
                      transformOrigin: settings.position
                    }}
                    onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'; }}
                  />
                </div>
              );
            })}
          </div>

          {/* Slider Dots */}
          {(product.images?.length > 1) && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5 z-20">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`h-1 rounded-full transition-all ${activeImageIndex === i ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                />
              ))}
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

          {/* Navigation Arrows (Laptop) */}
          {(product.images?.length > 1) && (
            <>
              <button 
                onClick={() => activeImageIndex > 0 && setActiveImageIndex(prev => prev - 1)}
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20 transition-all opacity-0 group-hover:opacity-100 ${activeImageIndex === 0 ? 'hidden' : ''}`}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => activeImageIndex < product.images.length - 1 && setActiveImageIndex(prev => prev + 1)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20 transition-all opacity-0 group-hover:opacity-100 ${activeImageIndex === product.images.length - 1 ? 'hidden' : ''}`}
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20 hover:bg-black/60 transition-all z-30"
          >
            <X size={18} />
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20">
            {isFresh && (
              <span className="bg-emerald-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                ✦ Fresh Stock
              </span>
            )}

            {!inStock && (
              <span className="bg-rose-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                Sold Out
              </span>
            )}
          </div>

          {/* Product name on image */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">{product.category || 'General'}</p>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight line-clamp-2">{product.name}</h2>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-4">

            {/* Price Row */}
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">
                    ₹{isWholesaleApplied ? product.wholesalePrice : product.price}
                  </span>
                  {product.sellingType === 'weight' && (
                    <span className="text-sm font-black text-gray-400">/kg</span>
                  )}
                  {(!shop?.isWholesale && product.mrp > product.price) && (
                    <span className="text-sm text-gray-400 line-through font-bold">
                      ₹{product.mrp}
                    </span>
                  )}
                </div>
                {shop?.isWholesale && product.wholesalePrice > 0 && (
                  <div className="mt-1">
                    {isWholesaleApplied ? (
                      <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest animate-pulse">
                        Bulk Rate Applied! — Saved ₹{(product.price - product.wholesalePrice).toFixed(2)} /unit
                      </p>
                    ) : (
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                        Buy <span className="text-sky-600 font-black">{product.minimumOrderQuantity}+</span> for Bulk Rate: <span className="text-sky-600 font-black">₹{product.wholesalePrice}</span>
                      </p>
                    )}
                  </div>
                )}
                {!shop?.isWholesale && product.mrp > product.price && (
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">
                    You save ₹{product.mrp - product.price}
                  </p>
                )}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                inStock
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {inStock
                  ? <><CheckCircle2 size={10} /> {product.stockQuantity} left</>
                  : <><AlertCircle size={10} /> Out of stock</>
                }
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-xs text-gray-500 font-medium leading-relaxed border-l-2 border-sky-300 pl-3 italic">
                {product.description}
              </p>
            )}

            {/* Meta Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex flex-col items-center text-center gap-1">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Package size={13} className="text-white" />
                </div>
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Unit</p>
                <p className="text-[11px] font-black text-blue-900 uppercase">{product.unit || '—'}</p>
              </div>

              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-3 flex flex-col items-center text-center gap-1">
                <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center">
                  <Layers size={13} className="text-white" />
                </div>
                <p className="text-[7px] font-black text-violet-400 uppercase tracking-widest">Category</p>
                <p className="text-[10px] font-black text-violet-900 uppercase leading-tight line-clamp-1">{product.category || '—'}</p>
              </div>

              <div className={`rounded-2xl p-3 flex flex-col items-center text-center gap-1 border ${
                product.sellingType === 'weight'
                  ? 'bg-sky-50 border-sky-100'
                  : 'bg-emerald-50 border-emerald-100'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  product.sellingType === 'weight' ? 'bg-sky-500' : 'bg-emerald-500'
                }`}>
                  <Scale size={13} className="text-white" />
                </div>
                <p className={`text-[7px] font-black uppercase tracking-widest ${
                  product.sellingType === 'weight' ? 'text-sky-400' : 'text-emerald-400'
                }`}>Type</p>
                <p className={`text-[10px] font-black uppercase ${
                  product.sellingType === 'weight' ? 'text-sky-900' : 'text-emerald-900'
                }`}>{product.sellingType === 'weight' ? 'Loose' : 'Packed'}</p>
              </div>
            </div>

            <div className="h-px bg-gray-100 my-2" />
            
            <ProductReviews productId={productId} aiSummary={product.aiReviewSummary} />
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex flex-col gap-2">
          {cartItem ? (
            <>
              <div className="flex items-center bg-gray-50 rounded-2xl p-1.5 gap-2 border border-gray-100">
                <button
                  onClick={() => updateQuantity(productId, -1)}
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-700 shadow-sm hover:shadow-md font-bold text-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >−</button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-black text-gray-900 leading-none">{parseFloat(Number(cartItem.quantity).toFixed(3))}</span>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">In Cart</p>
                </div>
                <button
                  onClick={() => updateQuantity(productId, 1)}
                  className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200 hover:bg-sky-600 font-bold text-xl transition-all active:scale-95"
                >+</button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onClose(); navigate('/cart'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-black transition-all active:scale-95"
                >
                  View Cart <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => removeFromCart(productId)}
                  className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all active:scale-95"
            >
              <ShoppingCart size={16} /> Add to Cart
            </button>
          )}

          {shop?.isWholesale && product.wholesalePrice > 0 && product.minimumOrderQuantity > 1 && inStock && (
            <button
              onClick={() => {
                addToCart(product, null, product.minimumOrderQuantity, false);
              }}
              className="w-full flex items-center justify-center gap-2 py-4 mt-3 bg-sky-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] hover:bg-sky-700 shadow-lg shadow-sky-200 transition-all active:scale-95"
            >
              <TrendingUp size={18} />
              {cartItem ? 'Add Another' : 'Add Bulk Quantity'} ({product.minimumOrderQuantity})
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => {
                toast.error(`Delete ${product.name}?`, {
                  action: {
                    label: "Delete",
                    onClick: () => {
                      deleteProduct(productId).then(res => {
                        if (res.success) { toast.success('Product removed'); onClose(); }
                      });
                    }
                  }
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all active:scale-95"
            >
              <Trash2 size={13} /> Remove from Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
