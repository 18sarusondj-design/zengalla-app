import React from 'react';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}
      {...props}
    />
  );
};

export const ProductSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
    <Skeleton className="w-full aspect-square rounded-2xl" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex items-center justify-between mt-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  </div>
);

export const ShopSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
    <Skeleton className="w-full h-48 rounded-2xl" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex gap-2 mt-2">
      <Skeleton className="h-8 w-20 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  </div>
);

export default Skeleton;
