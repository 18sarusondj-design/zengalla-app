import React from 'react';
import { Download } from 'lucide-react';
import usePWAInstall from '../hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';

const PWAInstallButton = ({ variant = 'default', className = "" }) => {
  const { isInstallable, installPWA, isInstalled, showGuide, setShowGuide } = usePWAInstall();

  // ONLY hide if we are currently INSIDE the standalone app
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isInStandalone) return null;

  const baseStyles = "flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest active:scale-95 text-center";
  
  const variants = {
    default: `px-4 py-2.5 rounded-xl text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-100 shadow-sm ${baseStyles}`,
    hero: `h-10 px-8 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-2xl shadow-sky-900/40 text-[9px] border border-sky-400/30 whitespace-nowrap ${baseStyles}`,
    banner: `w-full h-full px-5 py-4 bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-3xl shadow-lg flex-col ${baseStyles}`,
    sidebar: `px-4 py-3.5 rounded-2xl w-full text-sky-600 bg-sky-50 hover:bg-sky-100 text-xs tracking-tight border border-sky-100 shadow-sm flex-col ${baseStyles}`,
    brand: `px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md text-[10px] whitespace-nowrap shadow-xl hover:shadow-white/5 active:scale-95 ${baseStyles}`
  };

  const handleAction = () => {
    if (isInstalled) {
       // If installed, we can't "install" again, but we can't easily "launch" from JS in all browsers.
       // However, showing a guide on how to launch or just saying "App Installed" is better than nothing.
       setShowGuide(true);
    } else {
       installPWA();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button 
        onClick={handleAction}
        className={`${variants[variant] || variants.default} ${className}`}
      >
        <div className="flex items-center gap-2">
          <Download size={variant === 'hero' ? 18 : (variant === 'banner' ? 24 : 18)} strokeWidth={3} />
          <span>{isInstalled ? 'Open ZenGalla App' : 'Install ZenGalla App'}</span>
        </div>
      </button>

      

      <PWAInstallGuideModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </div>
  );
};


export default PWAInstallButton;
