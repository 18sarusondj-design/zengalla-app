import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Camera, Sparkles, CheckCircle2, User } from 'lucide-react';
import api from '../../../config/api.js';
import ReviewStars from './ReviewStars';

const ProductReviews = ({ productId, aiSummary }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/product/${productId}`);
        setReviews(res.data.reviews || []);
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5 shadow-lg shadow-sky-200">
            <Sparkles size={16} fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">AI Review Summary</p>
            <p className="text-sm font-bold text-sky-900 leading-relaxed italic">"{aiSummary}"</p>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Customer Reviews</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{reviews.length} total reviews</p>
        </div>
        {reviews.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900 leading-none">
              {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
            </p>
            <ReviewStars rating={reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length} size={10} className="justify-end mt-1" />
          </div>
        )}
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-[32px]">
            <MessageSquare size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No reviews yet for this product</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 border border-sky-100 shadow-inner">
                    <User size={20} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-gray-900 uppercase tracking-tight">{review.user?.name || 'Anonymous'}</h5>
                    <div className="flex items-center gap-2">
                      <ReviewStars rating={review.rating} size={8} />
                      <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-widest">
                        <CheckCircle2 size={10} fill="currentColor" className="text-white" /> Verified Purchase
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {review.comment}
              </p>

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                  {review.images.map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                      <img src={img} alt="Review" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
