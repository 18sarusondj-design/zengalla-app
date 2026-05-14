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
    if (needRefresh && !isCriticalFlow) {
      console.log('🔄 Automatic Update Triggered');
      updateServiceWorker(true);
    }
  }, [needRefresh, isCriticalFlow, updateServiceWorker]);

  React.useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline!', {
        description: 'You can now access ZenGalla even without an internet connection.',
        duration: 3000,
      });
    }
  }, [offlineReady]);

  return null;
};


export default PWAPrompt;
