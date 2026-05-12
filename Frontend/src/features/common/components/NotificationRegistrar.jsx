import React, { useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../config/api';

const NotificationRegistrar = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      registerPush();
    }
  }, [user]);

  const registerPush = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      
      const registration = await navigator.serviceWorker.ready;
      
      // Get existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Request permission if not granted
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe to push service
        const vapidPublicKey = 'BBE7cFA1KDV1VggPplgg8JtT9K_P-dDDgr613sEFZJUlU-MDfrYY59j2CAU_lvU1CEiskHLFOOJYdYx3lYos8nw';
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // Send subscription to backend
      await api.post('/notifications/subscribe', { subscription });
      console.log('Push registered successfully');
    } catch (err) {
      console.error('Push registration failed:', err);
    }
  };

  return null; // Invisible component
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default NotificationRegistrar;
