import React from 'react';
import { Loader2 } from 'lucide-react';

const FullScreenLoader = ({ message = "Loading your details..." }) => {
  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700"></div>

      <div className="relative">
        {/* Main Spinner */}
        <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl shadow-brand-primary/20 flex items-center justify-center border border-gray-100 mb-6 group">
          <Loader2 size={32} className="text-brand-primary animate-spin" />
          
          {/* Orbital rings */}
          <div className="absolute inset-x-[-8px] inset-y-[-8px] rounded-[32px] border-2 border-dashed border-brand-primary/10 animate-[spin_8s_linear_infinite]"></div>
        </div>

        {/* Text content */}
        <div className="space-y-2">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Please Wait</h3>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">{message}</p>
        </div>
      </div>
      
      {/* Bottom hint */}
      <div className="fixed bottom-12 left-0 right-0 px-12">
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-32 mx-auto">
          <div className="h-full bg-brand-primary w-1/2 animate-[progress_1.5s_ease-in-out_infinite] rounded-full"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />
    </div>
  );
};

export default FullScreenLoader;
