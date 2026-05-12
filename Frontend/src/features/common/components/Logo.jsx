import React from 'react';

const Logo = ({ className = "h-8", variant = "full", hideText = false }) => {
  // variant: "full" (Icon + Text), "icon" (Just icon)
  
  return (
    <div className={`flex items-center justify-center gap-2 bg-white rounded-xl p-1 shrink-0 ${className}`}>
      <img 
        src="/pwa-512.png?v=2026" 
        alt="Zengalla" 
        className="h-full w-auto object-contain max-h-full"
      />
      {!hideText && variant === "full" && (
        <span className="text-sky-600 font-black tracking-[0.3em] uppercase text-[9px] leading-none">Zengalla</span>
      )}
    </div>
  );
};

export default Logo;
