import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const PWAPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered');
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  React.useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline!', {
        description: 'You can now access ZenGalla even without an internet connection.',
        duration: 5000,
      });
    }
  }, [offlineReady]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[1000] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-sky-100 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-150">
          <Smartphone size={100} />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200 shrink-0">
            <RefreshCw size={24} className="animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Update Available</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">New features are ready for you</p>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex-1 bg-sky-600 text-white h-12 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-sky-700 transition-all active:scale-95 shadow-lg shadow-sky-100"
          >
            Update Now
          </button>
          <button
            onClick={() => close()}
            className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAPrompt;
