import React from 'react';

const AdminLogo = ({ className = "h-10 w-10" }) => {
  return (
    <div className={`flex items-center justify-center shrink-0 ${className} relative group transition-all duration-300`}>
      <div className="absolute inset-0 bg-sky-500/10 rounded-xl blur-lg group-hover:bg-sky-500/20 transition-all" />
      <svg 
        viewBox="0 0 100 100" 
        className="h-full w-full relative z-10 drop-shadow-sm"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hexagon Border */}
        <path 
          d="M50 5 L89.3 27.5 L89.3 72.5 L50 95 L10.7 72.5 L10.7 27.5 L50 5Z" 
          stroke="#0ea5e9" 
          strokeWidth="8" 
        />
        {/* Internal Sky Blue Hexagon Background */}
        <path 
          d="M50 12 L83.3 31.2 L83.3 68.8 L50 88 L16.7 68.8 L16.7 31.2 L50 12Z" 
          fill="#0ea5e9" 
        />
        {/* White 'Z' Logo */}
        <path 
          d="M35 35 H65 L35 65 H65" 
          stroke="white" 
          strokeWidth="10" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Detail Arrows */}
        <path d="M60 30 L65 35 L60 40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 60 L35 65 L40 70" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default AdminLogo;
