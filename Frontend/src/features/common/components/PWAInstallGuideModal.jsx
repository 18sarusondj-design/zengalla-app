import React from 'react';
import { X, Share, PlusSquare, Smartphone, Globe, Download, CheckCircle2 } from 'lucide-react';

const PWAInstallGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = React.useState('iOS');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Install Grozy</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Get the native app experience</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Device Selection Tabs */}
        <div className="px-8 flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('iOS')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === 'iOS' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}
          >
            iPhone / iPad
          </button>
          <button 
            onClick={() => setActiveTab('Android')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === 'Android' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}
          >
            Android / Chrome
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-10">
          <div className="space-y-4">
            {activeTab === 'iOS' ? (
              <>
                <Step num="1" icon={<Share size={18} className="text-sky-500" />} text="Open Safari and tap the 'Share' icon in the bottom menu." />
                <Step num="2" icon={<PlusSquare size={18} className="text-sky-500" />} text="Scroll down and tap 'Add to Home Screen'." />
                <Step num="3" icon={<Download size={18} className="text-sky-500" />} text="Tap 'Add' at the top right to finish." />
              </>
            ) : (
              <>
                <Step num="1" icon={<Globe size={18} className="text-emerald-500" />} text="Tap the three dots (⋮) in the top right corner of Chrome." />
                <Step num="2" icon={<Smartphone size={18} className="text-emerald-500" />} text="Tap 'Install app' or 'Add to Home Screen'." />
                <Step num="3" icon={<CheckCircle2 size={18} className="text-emerald-500" />} text="Follow the on-screen prompt to confirm." />
              </>
            )}
          </div>

          <div className="mt-8 p-4 bg-sky-50 rounded-3xl border border-sky-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
               <Download size={20} className="text-sky-600" />
            </div>
            <p className="text-[10px] font-bold text-sky-800 leading-tight">
               Installing the app allows for offline access, faster loading, and a full-screen experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Step = ({ num, icon, text }) => (
  <div className="flex items-center gap-4">
    <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">
      {num}
    </div>
    <div className="flex-1 flex items-center gap-3">
      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
        {icon}
      </div>
      <p className="text-[11px] font-black text-gray-600 leading-tight uppercase tracking-tight">{text}</p>
    </div>
  </div>
);

export default PWAInstallGuideModal;
