import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Smartphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

const PWAPrompt = () => {
  const location = useLocation();
  const [dismissed, setDismissed] = React.useState(
    sessionStorage.getItem('pwa-update-dismissed') === 'true'
  );

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (!r) return;
      console.log('SW Registered');
      // Check for updates immediately on load
      r.update();
      // Then check every hour
      setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    },

    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const isCriticalFlow = 
    location.pathname.includes('/checkout') || 
    location.pathname.includes('/billing') ||
    location.pathname.includes('/payment') ||
    location.pathname.includes('/order-status'); // Don't interrupt order tracking

  const close = () => {
    sessionStorage.setItem('pwa-update-dismissed', 'true');
    setDismissed(true);
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  React.useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline!', {
        description: 'You can now access ZenGalla even without an internet connection.',
        duration: 5000,
      });
    }
  }, [offlineReady]);

  // Only show prompt if refresh is needed, not dismissed in this session, and not in a critical flow
  const shouldShow = needRefresh && !dismissed && !isCriticalFlow;

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-white/10 flex flex-col gap-3 relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Update Ready</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">V2.1.0 Optimized</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <button
          onClick={handleUpdate}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
        >
          Update Now
        </button>
      </div>
    </div>
  );
};


export default PWAPrompt;
