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
      console.log('SW Registered');
      // Check for updates every hour
      r && setInterval(() => {
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
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-sky-100 dark:border-slate-800 flex flex-col gap-4 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-50 dark:bg-sky-900/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-4 relative">
          <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-sky-200 dark:shadow-none shrink-0 ring-4 ring-sky-50 dark:ring-sky-900/30">
            <RefreshCw size={28} className="animate-spin-slow" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">New update available</h3>
              <Sparkles size={16} className="text-sky-500 fill-sky-500" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Better performance and fixes added. Update now for the best experience.
            </p>
          </div>
          <button
            onClick={close}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={handleUpdate}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white h-14 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-sky-200 dark:shadow-none flex items-center justify-center gap-2 group"
          >
            <span>Update Now</span>
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        <div className="flex justify-center">
           <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">ZenGalla V2.1.0 Optimized</p>
        </div>
      </div>
    </div>
  );
};

export default PWAPrompt;
