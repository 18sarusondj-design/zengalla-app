import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ className = "h-8", variant = "icon", white = false, color = null }) => {
  const isSky = color === 'sky';
  const type = (white || isSky) ? 'white' : 'color';
  
  // Icon colors based on variant
  const primaryColor = (white || isSky) ? '#ffffff' : '#0ea5e9';
  const accentColor = (white || isSky) ? '#ffffff' : '#ffffff'; // White 'Z' on blue background, or white 'Z' on white/sky

  return (
    <Link to="/" className={`flex items-center gap-2 bg-transparent shrink-0 ${className} select-none cursor-pointer hover:opacity-90 transition-opacity`}>
      {/* Premium Hexagon Icon */}
      <div className="relative h-full aspect-square flex items-center justify-center shrink-0">
        <svg 
          viewBox="0 0 100 100" 
          className="h-full w-full drop-shadow-sm"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Hexagon Border */}
          <path 
            d="M50 5 L89.3 27.5 L89.3 72.5 L50 95 L10.7 72.5 L10.7 27.5 L50 5Z" 
            stroke={primaryColor} 
            strokeWidth="8" 
          />
          {/* Internal Hexagon Background */}
          <path 
            d="M50 12 L83.3 31.2 L83.3 68.8 L50 88 L16.7 68.8 L16.7 31.2 L50 12Z" 
            fill={primaryColor} 
          />
          {/* The 'G' Logo */}
          <path 
            d="M62 38 A18 18 0 1 0 62 62 H50 V50 H58" 
            stroke={white || isSky ? primaryColor : 'white'} 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ filter: (white || isSky) ? 'brightness(0.9) contrast(1.2) invert(1)' : 'none' }}
          />
        </svg>
      </div>

      {/* Brand Text for Full Variant */}
      {variant === "full" && (
        <div className="flex flex-col justify-center">
          <span className={`text-[1.2em] font-black uppercase tracking-tighter leading-[0.8] ${white || isSky ? 'text-white' : 'text-slate-900'}`}>
            Grozy
          </span>
          <span className={`text-[0.4em] font-black uppercase tracking-[0.3em] mt-1 ${white || isSky ? 'text-white/40' : 'text-sky-600/60'}`}>
            Nearby Grocery
          </span>
        </div>
      )}
    </Link>
  );
};

export default Logo;
