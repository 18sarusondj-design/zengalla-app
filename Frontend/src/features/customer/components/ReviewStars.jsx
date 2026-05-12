import React from 'react';
import { Star, StarHalf } from 'lucide-react';

const ReviewStars = ({ rating, size = 12, className = "" }) => {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.floor(safeRating);
  const hasHalfStar = (safeRating % 1) >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={size} fill="#0ea5e9" className="text-sky-500" />
      ))}
      {hasHalfStar && (
        <StarHalf key="half" size={size} fill="#0ea5e9" className="text-sky-500" />
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="text-gray-200" />
      ))}
      <span className="ml-1 text-[10px] font-bold text-gray-500">
        {rating > 0 ? rating.toFixed(1) : 'No reviews'}
      </span>
    </div>
  );
};

export default ReviewStars;
