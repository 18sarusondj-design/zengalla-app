import React from 'react';

const Logo = ({ className = "h-8", variant = "icon", white = false }) => {
  const type = white ? 'white' : 'color';
  const logoSrc = variant === "full" ? `/logo_full_${type}.png` : `/logo_icon_${type}.png`;
  
  return (
    <div className={`flex items-center justify-center bg-transparent shrink-0 ${className}`}>
      {/* 
        PRECISION TRANSPARENCY FILTER:
        Uses luminance to calculate transparency, preserving the sharp edges 
        of the text and logo while making the black background 100% invisible.
      */}
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
        style={{ filter: white ? 'url(#precise-transparency)' : 'none' }}
      />
    </div>
  );
};

export default Logo;
