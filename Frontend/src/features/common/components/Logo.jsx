import React from 'react';

const Logo = ({ className = "h-8", variant = "full", hideText = false }) => {
  // variant: "full" (Icon + Text), "icon" (Just icon)
  const logoSrc = variant === "icon" ? "/logo.png" : "/zengalla_logo.png";
  
  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      <img 
        src={logoSrc} 
        alt="Zengalla" 
        className="h-full w-auto object-contain max-h-full drop-shadow-sm"
      />
    </div>
  );
};

export default Logo;
