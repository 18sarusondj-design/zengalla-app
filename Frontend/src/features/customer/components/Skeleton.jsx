import React from 'react';

export const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-800 rounded-md ${className}`} />
);

export const ProductSkeleton = () => (
  <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm flex flex-col gap-3 p-3 h-full">
    <Skeleton className="aspect-[4/3] rounded-2xl w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-10 w-full rounded-xl" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-full rounded-xl" />
      <Skeleton className="h-8 w-10 rounded-xl" />
    </div>
  </div>
);

export const ShopSkeleton = () => (
  <div className="bg-white rounded-[32px] overflow-hidden border border-gray-50 shadow-sm flex flex-col h-full">
    <Skeleton className="h-48 w-full" />
    <div className="p-6 flex flex-col gap-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center mt-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
    </div>
  </div>
);
