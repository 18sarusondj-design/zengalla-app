import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notifications enabled!');
      return true;
    }
    return false;
  };

  const showLocalNotification = (title, body, options = {}) => {
    if (permission !== 'granted') return;

    const defaultOptions = {
      body,
      icon: '/logo.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      ...options
    };

    // Play Sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Sound blocked by browser'));

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  };

  return {
    permission,
    requestPermission,
    showLocalNotification
  };
};

export default useNotifications;
