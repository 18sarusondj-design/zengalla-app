import React from 'react';
import { Download } from 'lucide-react';
import usePWAInstall from '../hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';

const PWAInstallButton = ({ variant = 'default', className = "" }) => {
  const { isInstalled, installPWA, showGuide, setShowGuide } = usePWAInstall();

  if (isInstalled) return null;

  const baseStyles = "flex flex-col items-center justify-center gap-1 transition-all font-black uppercase tracking-widest active:scale-95 text-center";
  
  const variants = {
    default: `px-4 py-2.5 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 shadow-sm ${baseStyles}`,
    hero: `h-14 px-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-900/40 text-[11px] border border-emerald-400/30 ${baseStyles}`,
    banner: `w-full h-full px-5 py-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-3xl shadow-lg ${baseStyles}`,
    sidebar: `px-4 py-3.5 rounded-2xl w-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs tracking-tight border border-emerald-100 shadow-sm ${baseStyles}`
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button 
        onClick={installPWA}
        className={`${variants[variant] || variants.default} ${className}`}
      >
        <div className="flex items-center gap-2">
          <Download size={variant === 'hero' ? 18 : (variant === 'banner' ? 24 : 18)} strokeWidth={3} />
          <span>Install ZenGalla App</span>
        </div>
      </button>
      
      {variant !== 'hero' && (
        <p className="text-[9px] font-bold text-sky-400 uppercase tracking-widest">
          Install for the best experience
        </p>
      )}

      <PWAInstallGuideModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </div>
  );
};


export default PWAInstallButton;
