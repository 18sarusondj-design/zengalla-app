import React from 'react';
import { Loader2 } from 'lucide-react';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-sky-100 dark:border-slate-800 rounded-full" />
        <div className="w-16 h-16 border-4 border-t-sky-500 rounded-full animate-spin absolute top-0 left-0" />
      </div>
      <div className="flex flex-col items-center">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Grozy</h2>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-pulse">Loading Experience...</p>
      </div>
    </div>
  );
};

export default PageLoader;
