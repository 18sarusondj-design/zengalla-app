import React, { useState } from 'react';
import { Star, X, Check, ShoppingBag, Truck, Package, MessageSquare, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../shop/context/StoreContext';
import api from '../../../config/api.js';

const ReviewModal = ({ isOpen, onClose, order }) => {
  const { submitReview } = useStore();
  const [loading, setLoading] = useState(false);
  
  const [productReviews, setProductReviews] = useState(
    order?.items?.map(item => ({
      productId: item.product?._id || item.product?.id || item.product,
      name: item.name || item.product?.name || 'Product',
      rating: 5,
      comment: '',
      images: []
    })) || []
  );
  
  const [overallComment, setOverallComment] = useState('');

  const handleStarClick = (type, rating, productId = null) => {
    if (productId) {
      setProductReviews(prev => prev.map(p => 
        p.productId === productId ? { ...p, rating } : p
      ));
    }
  };

  const handleProductComment = (productId, comment) => {
    setProductReviews(prev => prev.map(p => 
      p.productId === productId ? { ...p, comment } : p
    ));
  };

  const handleImageUpload = async (productId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    const toastId = toast.loading("Uploading photo...");
    try {
      const { data } = await api.post('/upload/image', formData);
      if (data.success) {
        setProductReviews(prev => prev.map(p => 
          p.productId === productId ? { ...p, images: [...p.images, data.url] } : p
        ));
        toast.success("Photo added!", { id: toastId });
      }
    } catch (err) {
      toast.error("Upload failed", { id: toastId });
    }
  };

  const removeImage = (productId, index) => {
    setProductReviews(prev => prev.map(p => 
      p.productId === productId 
        ? { ...p, images: p.images.filter((_, i) => i !== index) } 
        : p
    ));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await submitReview({
        orderId: order._id || order.id,
        shopId: typeof order.shopId === 'object' ? (order.shopId._id || order.shopId.id) : order.shopId,
        productReviews: productReviews.map(({ productId, rating, comment, images }) => ({
          productId,
          rating,
          comment,
          images
        })),
        overallComment
      });
      
      if (result.success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const RatingStars = ({ rating, onRate, size = 20 }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          className={`transition-all ${star <= rating ? 'text-brand-yellow scale-110' : 'text-gray-200 hover:text-brand-yellow/40'}`}
        >
          <Star size={size} fill={star <= rating ? 'currentColor' : 'none'} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-all active:scale-90"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-brand-primary/10 rounded-[22px] flex items-center justify-center text-brand-primary shadow-inner">
               <Star size={28} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">Rate Your Order</h2>
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mt-1.5">How was your experience?</p>
            </div>
          </div>
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10 custom-scrollbar">
          
          {/* Product Ratings */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-gray-400" />
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Product Quality</h3>
            </div>
            
            <div className="space-y-4">
              {productReviews.map((pr) => (
                <div key={pr.productId} className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[13px] font-black text-gray-900 uppercase tracking-tight truncate max-w-[200px]">
                      {pr.name}
                    </h4>
                    <RatingStars 
                      rating={pr.rating} 
                      onRate={(r) => handleStarClick(null, r, pr.productId)} 
                      size={18}
                    />
                  </div>
                  <textarea
                    placeholder="Write a small comment about this item..."
                    className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white transition-all placeholder:text-gray-300 resize-none h-20"
                    value={pr.comment}
                    onChange={(e) => handleProductComment(pr.productId, e.target.value)}
                  />

                  {/* Image Upload for Products */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pr.images?.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shadow-sm animate-in zoom-in duration-300">
                        <img src={img} alt="Product" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeImage(pr.productId, i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-rose-500 transition-colors"
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                    
                    <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl cursor-pointer hover:border-sky-300 hover:bg-sky-50 transition-all group/upload">
                      <Camera size={18} className="text-gray-300 group-hover/upload:text-sky-500 group-hover/upload:scale-110 transition-all" />
                      <span className="text-[7px] font-black uppercase text-gray-400 mt-1">Add Photo</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(pr.productId, e)} 
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Overall Comment */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Overall Feedback</h3>
            <textarea
              placeholder="Any other comments about the order or store?"
              className="w-full bg-gray-50/80 border border-gray-100 rounded-[32px] p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white transition-all placeholder:text-gray-300 resize-none h-32"
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
            />
          </div>
          
        </div>
        
        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 shrink-0">
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-gray-900 hover:bg-brand-primary text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.25em] shadow-xl shadow-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                Submit Feedback
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ReviewModal;
