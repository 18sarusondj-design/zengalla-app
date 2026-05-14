import React from 'react';

const Logo = ({ className = "h-8", variant = "icon", white = false, color = null }) => {
  const isSky = color === 'sky';
  const type = (white || isSky) ? 'white' : 'color';
  const logoSrc = variant === "full" ? `/logo_full_${type}.png` : `/logo_icon_${type}.png`;
  
  // CSS Filter to turn white logo into Sky Blue (#0ea5e9)
  const skyFilter = "invert(58%) sepia(91%) saturate(2206%) hue-rotate(170deg) brightness(98%) contrast(93%)";

  return (
    <div className={`flex items-center justify-center bg-transparent shrink-0 ${className}`}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="precise-transparency">
          <feColorMatrix type="matrix" values="0 0 0 0 1 
                                              0 0 0 0 1 
                                              0 0 0 0 1 
                                              1 1 1 0 -0.1" />
        </filter>
      </svg>
      
      <img 
        src={logoSrc} 
        alt="Zengalla" 
        className="h-full w-auto object-contain max-h-full transition-transform active:scale-95"
        style={{ 
          filter: isSky ? skyFilter : (white ? 'url(#precise-transparency)' : 'none') 
        }}
      />
    </div>
  );
};

export default Logo;
