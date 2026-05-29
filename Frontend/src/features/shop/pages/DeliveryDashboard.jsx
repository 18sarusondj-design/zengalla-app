import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, ArrowRight, Loader2, Navigation, Navigation2, CheckCircle2, XCircle, LogOut, User, Zap, ShieldCheck, MessageSquare, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const DeliveryDashboard = () => {
  const { getAvailableOrders, getMyActiveOrder, acceptOrder, rejectOrder, updateDeliveryStatus, getDeliveryHistory, updateDriverLocation, toggleOnlineStatus } = useStore();
  const { user, logout, changePassword } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationError, setLocationError] = useState(false);
  
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocationGranted(true),
      () => {
        setLocationError(true);
        setLocationGranted(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('deliveryActiveTab') || 'orders';
  });

  useEffect(() => {
    sessionStorage.setItem('deliveryActiveTab', activeTab);
  }, [activeTab]);

  const [showItemsFor, setShowItemsFor] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [trainingLang, setTrainingLang] = useState('english');

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [alertAudio, setAlertAudio] = useState(null);
  const notifiedOrders = useRef(new Set());

  // Profile State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Bank Profile State
  const [bankDetails, setBankDetails] = useState({
    accountName: user?.accountName || '',
    accountNumber: user?.accountNumber || '',
    ifscCode: user?.ifscCode || '',
    bankName: user?.bankName || ''
  });
  const { updateProfile } = useAuth();

  // Sound Alert System
  const startLongAlert = (type = 'assigned') => {
    if (alertAudio) return; // Already playing

    // Using a more persistent alert sound
    const audio = new window.Audio(type === 'packed'
      ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' // Short for packed
      : 'https://assets.mixkit.co/active_storage/sfx/1000/1000-preview.mp3' // Long for assignment
    );
    audio.loop = true;
    audio.play().catch(e => console.log("Sound blocked by browser policy"));
    setAlertAudio(audio);
  };

  const stopAlert = () => {
    if (alertAudio) {
      alertAudio.pause();
      alertAudio.currentTime = 0;
      setAlertAudio(null);
    }
  };

  // Hardware Back Button Handler
  useEffect(() => {
    const handleBackButton = (e) => {
      if (showItemsFor) {
        e.preventDefault();
        setShowItemsFor(null);
      }
    };

    if (showItemsFor) {
      window.history.pushState(null, null, window.location.pathname);
      window.addEventListener('popstate', handleBackButton);
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [showItemsFor]);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const { data } = await api.get('/notifications/vapid-key');
        const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
      
      await api.post('/notifications/subscribe', { subscription });
    } catch (err) {
      console.error("Push subscription failed", err);
    }
  };

  useEffect(() => {
    if (!isOnline) return;

    subscribeToPush();fetchData(true);
    const interval = setInterval(() => fetchData(false), 8000); // Faster sync for notifications

    // Live Location Tracking
    let watchId;
    if (navigator.geolocation && isOnline) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });
          const now = Date.now();
          if (!window.lastLocationUpdate || now - window.lastLocationUpdate > 10000) {
            window.lastLocationUpdate = now;
            updateDriverLocation(latitude, longitude);
          }
        },
        (err) => console.error("Geo error:", err),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    }

    return () => {
      clearInterval(interval);
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (alertAudio) alertAudio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [available, active, history] = await Promise.all([
        getAvailableOrders(),
        getMyActiveOrder(),
        getDeliveryHistory()
      ]);

      const newActive = Array.isArray(active) ? active : (active ? [active] : []);

      // 🚀 TRIGGER: NEW MISSION ASSIGNED
      const newMission = newActive.find(o =>
        o.status === 'ASSIGNED' &&
        !o.isPartnerAccepted &&
        !notifiedOrders.current.has(`${o._id}-assigned`)
      );

      if (newMission) {
        notifiedOrders.current.add(`${newMission._id}-assigned`);
        startLongAlert('mission');
        toast.info("NEW MISSION ASSIGNED! CHECK RADAR.", {
          id: `mission-${newMission._id}`,
          duration: 10000
        });
      }

      // 📦 TRIGGER: Order Marked as READY (Packed)
      const packedOrder = newActive.find(o =>
        o.status === 'READY' &&
        !notifiedOrders.current.has(`${o._id}-packed`)
      );

      if (packedOrder) {
        notifiedOrders.current.add(`${packedOrder._id}-packed`);
        startLongAlert('packed');
        toast.success(`ORDER #${packedOrder._id.slice(-6).toUpperCase()} PACKED! COME TO STORE.`, {
          id: `packed-${packedOrder._id}`,
          duration: 10000
        });
      }

      setAvailableOrders(available || []);
      setActiveOrders(newActive);
      setHistoryOrders(history || []);
    } catch (err) {
      console.error("Failed to fetch delivery data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    setActionLoading(true);
    const res = await toggleOnlineStatus();
    if (res.success) {
      setIsOnline(res.isOnline);
      fetchData(false);
    }
    setActionLoading(false);
  };

  const handleAcceptOrder = async (orderId) => {
    if (!isOnline) return toast.error("Go online to accept orders!");
    if (activeOrders.length >= 3) return toast.error("Active limit reached (3/3)");
    stopAlert();
    toast.dismiss(`mission-${orderId}`);
    setActionLoading(true);
    const res = await acceptOrder(orderId);
    if (res.success) {
      notifiedOrders.current.add(`${orderId}-assigned`);
      fetchData(false);
    }
    setActionLoading(false);
  };

  const handleRejectOrder = async (orderId) => {
    stopAlert();
    toast.dismiss(`mission-${orderId}`);
    setActionLoading(true);
    const res = await rejectOrder(orderId);
    if (res.success) {
      fetchData(false);
    }
    setActionLoading(false);
  };

  const handleStatusUpdate = async (orderId, status) => {
    stopAlert(); // Stop "packed" sound if user interacts
    setActionLoading(true);
    let res;
    if (status === 'ACCEPTED') {
      res = await acceptOrder(orderId);
    } else if (status === 'REJECTED') {
      res = await rejectOrder(orderId);
    } else {
      res = await updateDeliveryStatus(orderId, status);
    }

    setActionLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    
    setActionLoading(true);
    const res = await changePassword(oldPassword, newPassword);
    
    if (res.success) {
      toast.success("Security profile updated");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(res.error || "Update failed");
    }
    setActionLoading(false);
  };

  const handleUpdateBankDetails = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await updateProfile(bankDetails);
    if (res.success) {
      toast.success("Bank details updated successfully");
    } else {
      toast.error(res.error || "Failed to update bank details");
    }
    setActionLoading(false);
  };

  const totalEarnings = historyOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
    const todayEarnings = historyOrders
      .filter(o => new Date(o.updatedAt).toDateString() === new Date().toDateString())
      .reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

    if (!locationGranted) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-[9999] fixed inset-0">
          <div className="w-24 h-24 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-rose-500/20 mb-8 animate-bounce">
            <MapPin size={48} />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-4">Live Location Required</h1>
          <p className="text-slate-400 text-sm max-w-sm mb-8 font-bold leading-relaxed">
            You must grant location access to use the App. This allows us to track deliveries and show you on the radar. Please allow location access and click below.
          </p>
          <div className="flex gap-4">
            <button onClick={() => window.location.reload()} className="h-14 px-8 bg-sky-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/20">
              I've Enabled It
            </button>
            <button onClick={() => { logout(); window.location.href = '/delivery/login'; }} className="h-14 px-8 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all border border-slate-700">
              Logout
            </button>
          </div>
        </div>
      );
    }
  
    if (loading && activeOrders.length === 0 && availableOrders.length === 0 && historyOrders.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-sky-600" size={48} />
        <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest animate-pulse">Syncing Hub...</p>
      </div>
    );
  }

  if (user && user.status !== 'active') {
    let title = "Account Pending Review";
    let msg = "Your application is currently being reviewed by the admin. You will be notified once approved.";
    let iconClass = "text-amber-500 bg-amber-50 border-amber-100";
    let icon = <Clock size={48} className="animate-pulse" />;

    if (user.status === 'suspended') {
       title = "Account Suspended";
       msg = "Your delivery partner account has been suspended due to policy violations. Please contact support.";
       iconClass = "text-rose-500 bg-rose-50 border-rose-100";
       icon = <XCircle size={48} />;
    } else if (user.status === 'rejected') {
       title = "Application Rejected";
       msg = "Your application to join the fleet has been rejected. Please contact support for more details.";
       iconClass = "text-rose-500 bg-rose-50 border-rose-100";
       icon = <XCircle size={48} />;
    }

    const trainingVideos = {
      english: 'https://www.youtube.com/embed/rP-z0M16RAs', // Random placeholders
      hindi: 'https://www.youtube.com/embed/s2h28p4s-Xs',
      kannada: 'https://www.youtube.com/embed/1vRzT_0eO1E'
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans overflow-y-auto">
         <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm border ${iconClass}`}>
            {icon}
         </div>
         <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-2">{title}</h1>
         <p className="text-[10px] text-gray-500 font-bold max-w-sm leading-relaxed uppercase tracking-widest mb-6">
            {msg}
         </p>

         {/* Training Video Section */}
         <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Package size={16} className="text-sky-500" />
              Delivery Training
            </h2>
            
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900 shadow-inner mb-4">
               <iframe 
                 className="absolute inset-0 w-full h-full"
                 src={trainingVideos[trainingLang]}
                 title="Training Video"
                 frameBorder="0"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowFullScreen
               ></iframe>
            </div>

            <div className="flex justify-center gap-2">
              {['english', 'hindi', 'kannada'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setTrainingLang(lang)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    trainingLang === lang 
                      ? 'bg-sky-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
         </div>

         <button onClick={() => { logout(); window.location.href = '/delivery/login'; }} className="h-12 px-8 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-rose-600 transition-all">
            Logout & Exit
         </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] font-sans pb-32">
      {/* Header - Glassmorphism */}
      <header className="bg-white/80 backdrop-blur-xl px-4 sm:px-6 py-4 sm:py-6 border-b border-sky-100 flex justify-between items-center sticky top-0 z-[100] shadow-sm gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-200 shrink-0">
            <Truck size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight leading-none italic uppercase truncate">Hub Console</h1>
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleOnline}
            disabled={actionLoading}
            className={`h-9 sm:h-11 px-3 sm:px-6 rounded-xl sm:rounded-2xl font-black uppercase text-[8px] sm:text-[9px] tracking-widest transition-all duration-300 flex items-center gap-1.5 sm:gap-2 shadow-lg ${isOnline
              ? 'bg-sky-600 text-white shadow-sky-200 ring-2 sm:ring-4 ring-sky-50'
              : 'bg-white text-gray-400 border border-gray-100'
              }`}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={12} /> : (isOnline ? <Zap size={12} /> : <XCircle size={12} />)}
            {isOnline ? 'Online' : 'Go Online'}
          </button>

          <button
            onClick={() => { logout(); window.location.href = '/delivery/login'; }}
            className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-gray-300 hover:text-rose-500 transition-all border border-gray-100"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">

        {/* Location Status Alert */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-100">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-none mb-1">Radar Offline</p>
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tight">Go Online to enable live tracking for users</p>
            </div>
          </div>
        )}

        {isOnline && !navigator.geolocation && (
          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex items-center gap-4 animate-bounce">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-100">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest leading-none mb-1">GPS DISABLED</p>
              <p className="text-[9px] font-bold text-rose-600 uppercase tracking-tight">PLEASE ENABLE LOCATION IN SETTINGS</p>
            </div>
          </div>
        )}

        {/* Earnings Card - Modern Sky Grid */}
        <div className="bg-sky-600 rounded-[48px] p-8 shadow-[0_25px_60px_-15px_rgba(14,165,233,0.4)] text-white relative overflow-hidden group">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-[100px] transition-transform group-hover:scale-150 duration-1000" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/10 rounded-full blur-[80px]" />

          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={12} className="text-sky-200" />
                <p className="text-[10px] font-black text-sky-100 uppercase tracking-[0.3em]">Total Revenue</p>
              </div>
              <h2 className="text-5xl font-black tracking-tightest flex items-baseline gap-2 italic">
                ₹{totalEarnings}
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-lg not-italic font-black">NET</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-sky-200 uppercase tracking-widest mb-1">Today's Peak</p>
              <h2 className="text-2xl font-black text-white tracking-tighter italic">+₹{todayEarnings}</h2>
            </div>
          </div>
        </div>

        {activeTab === 'orders' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Live Missions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                  <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Missions Assigned</h2>
                </div>
                <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-2 py-1 rounded-lg uppercase">{activeOrders.length} Orders</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map(order => (
                  <div key={order._id} className="bg-white rounded-[32px] border border-sky-100 shadow-[0_8px_30px_rgba(14,165,233,0.05)] overflow-hidden transition-all hover:shadow-xl hover:border-sky-200">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600 border border-sky-100 shadow-inner">
                            <Package size={18} />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter italic leading-none">#{order._id.slice(-6).toUpperCase()}</h3>
                            <p className="text-[8px] font-black text-sky-500 uppercase tracking-widest mt-1">{order.shopId?.name || 'Store'}</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-sky-600 text-white rounded-lg text-[7px] font-black uppercase shadow-lg shadow-sky-200">
                          {order.status.replace(/_/g, ' ')}
                        </div>
                      </div>

                      {/* Quick Order Info - Amount & Category */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-gray-50 rounded-2xl p-2 border border-gray-100 flex flex-col items-center justify-center text-center">
                          <span className="text-[6px] font-black uppercase text-gray-400 tracking-[0.2em] mb-0.5">Order Amount</span>
                          <span className="text-sm font-black text-gray-900 tracking-tighter">₹{order.totalPrice || 0}</span>
                        </div>
                        <div className="bg-sky-50/30 rounded-2xl p-2 border border-sky-100/50 flex flex-col items-center justify-center text-center">
                          <span className="text-[6px] font-black uppercase text-sky-400 tracking-[0.2em] mb-0.5">Mission Payout</span>
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight italic">
                            ₹{(order.deliveryFee || 0) + (order.extraAmount || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 mb-5">
                        <button
                          onClick={() => window.open(`tel:${order.phone}`)}
                          className="flex items-center justify-center gap-3 h-10 bg-sky-50 text-sky-600 rounded-xl font-black text-[9px] uppercase tracking-widest border border-sky-100 hover:bg-sky-100 transition-all active:scale-95 shadow-sm"
                        >
                          <Phone size={14} /> Contact Client
                        </button>
                      </div>

                      {/* Store Location - Enhanced Design */}
                      <div className="bg-[#F0F9FF] rounded-2xl p-3 flex items-center justify-between gap-3 border border-[#E0F2FE] mb-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden ml-1">
                          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#F59E0B] shrink-0 shadow-inner border border-[#FFEDD5]">
                            <Package size={18} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[8px] font-black uppercase text-[#D97706] tracking-[0.2em]">Pick From Store</span>
                              {currentCoords && order.shopId?.location && (
                                <span className="text-[8px] font-black text-white bg-[#D97706] px-1.5 py-0.5 rounded-lg shadow-sm">
                                  {getDistance(currentCoords.lat, currentCoords.lng, order.shopId.location.lat, order.shopId.location.lng)} KM
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] font-black text-[#334155] uppercase truncate tracking-tighter">
                              {order.shopId?.name || 'Store Location'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.shopId?.location?.lat},${order.shopId?.location?.lng}`, '_blank')}
                          className="w-12 h-12 bg-[#0EA5E9] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-[#0284C7] group"
                        >
                          <Navigation2 size={20} className="rotate-45 transition-transform group-hover:scale-110" />
                        </button>
                      </div>

                      {/* User Location - Enhanced Design */}
                      <div className="bg-[#F0F9FF] rounded-2xl p-3 flex items-center justify-between gap-3 border border-[#E0F2FE] mb-6 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden ml-1">
                          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#0EA5E9] shrink-0 shadow-inner border border-[#E0F2FE]">
                            <MapPin size={18} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[8px] font-black uppercase text-[#0369A1] tracking-[0.2em]">Deliver To User</span>
                              {order.shopId?.location && order.deliveryLocation && (
                                <span className="text-[8px] font-black text-white bg-[#0EA5E9] px-1.5 py-0.5 rounded-lg shadow-sm">
                                  {getDistance(order.shopId.location.lat, order.shopId.location.lng, order.deliveryLocation.lat, order.deliveryLocation.lng)} KM
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] font-black text-[#334155] uppercase truncate tracking-tighter">
                              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLocation?.lat},${order.deliveryLocation?.lng}`, '_blank')}
                          className="w-12 h-12 bg-[#0EA5E9] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-[#0284C7] group"
                        >
                          <Navigation2 size={20} className="rotate-45 transition-transform group-hover:scale-110" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => setShowItemsFor(order)}
                          className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                          Details
                        </button>
                        {order.status === 'ASSIGNED' && !order.isPartnerAccepted ? (
                          <div className="flex-[2.5] flex gap-2">
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'REJECTED')}
                              disabled={actionLoading}
                              className="flex-1 h-12 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl font-black uppercase text-[9px] tracking-widest active:scale-95 transition-all hover:bg-rose-100"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'ACCEPTED')}
                              disabled={actionLoading}
                              className="flex-[2.2] h-12 bg-[#0EA5E9] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 hover:bg-[#0284C7] transition-all"
                            >
                              Accept Mission
                            </button>
                          </div>
                        ) : order.status === 'ASSIGNED' ? (
                          <div className="flex-[2] h-12 bg-sky-50 text-sky-600 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2 border border-dashed border-sky-200">
                            <Clock size={14} className="animate-pulse" /> Awaiting Preparation
                          </div>
                        ) : order.status === 'READY' ? (
                          <button
                            onClick={() => handleStatusUpdate(order._id, 'OUT_FOR_DELIVERY')}
                            disabled={actionLoading}
                            className="flex-[2] h-12 bg-[#F59E0B] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 hover:bg-[#D97706] transition-all"
                          >
                            <Truck size={16} /> Start Delivery
                          </button>
                        ) : order.status === 'PACKING' ? (
                          <div className="flex-[2] h-12 bg-gray-50 text-gray-400 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2 border border-dashed border-gray-200">
                            <Clock size={14} className="animate-spin-slow" /> Store is Packing...
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStatusUpdate(order._id, 'COMPLETED')}
                            disabled={actionLoading}
                            className="flex-[2] h-12 bg-[#059669] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 hover:bg-[#047857] transition-all"
                          >
                            <CheckCircle size={16} /> Complete Drop-off
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeOrders.length === 0 && (
                <div className="py-24 text-center bg-white rounded-[56px] border border-dashed border-sky-200/50 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-sky-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center text-sky-200 mx-auto mb-8 border border-sky-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Clock size={48} />
                  </div>
                  <h3 className="text-gray-900 font-black uppercase tracking-tightest italic text-xl">Waiting for Mission</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] mt-3">Vendor will assign orders to you</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'profile' ? (
          /* Profile View - Premium Security */
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[48px] p-10 border border-sky-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -mr-16 -mt-16" />
               
                 <div className="flex flex-col items-center mb-10 relative z-10">
                   <div className="w-24 h-24 bg-sky-50 rounded-[32px] flex items-center justify-center text-sky-600 shadow-inner border border-sky-100 mb-6 group hover:scale-105 transition-transform duration-500">
                     <User size={48} />
                   </div>
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tightest italic">{user?.name}</h2>
                   <div className="flex items-center gap-2 mt-2">
                     <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.4em]">Logistics Specialist</p>
                     <span className="px-2 py-0.5 bg-gray-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">Token: #{user?._id?.slice(-6).toUpperCase()}</span>
                   </div>
                   <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Account Active</span>
                   </div>
                 </div>

                 {/* Settlement Account Section */}
                 <form onSubmit={handleUpdateBankDetails} className="space-y-6 relative z-10 mb-10 pb-8 border-b border-gray-100">
                   <div className="flex items-center gap-3 px-2 mb-2">
                      <div className="w-1 h-3 bg-sky-500 rounded-full" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Settlement Account Details</h4>
                   </div>

                   <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="relative">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Account Holder</label>
                          <input 
                            type="text" required
                            placeholder="Full Name"
                            className="w-full px-5 h-14 bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white rounded-[20px] text-xs font-bold transition-all"
                            value={bankDetails.accountName}
                            onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})}
                          />
                       </div>

                       <div className="relative">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Account Number</label>
                          <input 
                            type="text" required
                            placeholder="00000000000"
                            className="w-full px-5 h-14 bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white rounded-[20px] text-xs font-bold transition-all"
                            value={bankDetails.accountNumber}
                            onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                          />
                       </div>

                       <div className="relative">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block">IFSC Code</label>
                          <input 
                            type="text" required
                            placeholder="SBIN0001234"
                            className="w-full px-5 h-14 bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white rounded-[20px] text-xs font-bold transition-all uppercase"
                            value={bankDetails.ifscCode}
                            onChange={e => setBankDetails({...bankDetails, ifscCode: e.target.value.toUpperCase()})}
                          />
                       </div>

                       <div className="relative">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Bank Name</label>
                          <input 
                            type="text" required
                            placeholder="Bank Name"
                            className="w-full px-5 h-14 bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white rounded-[20px] text-xs font-bold transition-all"
                            value={bankDetails.bankName}
                            onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})}
                          />
                       </div>
                     </div>
                   </div>

                   <button 
                     type="submit"
                     disabled={actionLoading}
                     className="w-full h-14 bg-sky-500 text-white rounded-[20px] font-black uppercase text-[10px] tracking-[0.3em] shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     {actionLoading ? <Loader2 className="animate-spin" size={16} /> : "Save Bank Details"}
                   </button>
                 </form>
              </div>
            </div>
        ) : (
          /* History View - Dark Minimalist */
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1.5 h-4 bg-sky-500 rounded-full" />
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Ledger Archive</h2>
            </div>
            <div className="space-y-4">
              {historyOrders.map(order => (
                <div 
                  key={order._id} 
                  onClick={() => setShowItemsFor(order)}
                  className="bg-white rounded-[32px] p-6 border border-gray-100 flex items-center justify-between gap-4 group hover:border-sky-200 hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-[22px] flex items-center justify-center border border-sky-100 group-hover:bg-sky-100 transition-colors shadow-sm">
                      <CheckCircle size={28} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-sm italic">#{order._id.slice(-6).toUpperCase()}</h4>
                      <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mt-1">
                        {new Date(order.updatedAt).toLocaleDateString()} • ₹{order.deliveryFee || 0} FEE
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900 text-lg italic tracking-tightest">₹{order.totalPrice}</p>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Settled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Nav - Ultra Premium */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[380px] z-[1000] px-4">
        <div className="bg-gray-900/95 backdrop-blur-2xl text-white h-20 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] flex items-center justify-around px-2 border border-white/10 ring-1 ring-white/20">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'orders' ? 'text-sky-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Package size={22} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Missions</span>
          </button>
          
          <div className="w-[1px] h-6 bg-white/10 rounded-full" />
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'history' ? 'text-sky-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Clock size={22} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Ledger</span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 rounded-full" />

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'profile' ? 'text-sky-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <User size={22} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Profile</span>
          </button>
        </div>
      </div>

      {/* Mission Items Modal - Slide Up Premium */}
      {showItemsFor && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-500" onClick={() => setShowItemsFor(null)} />
          <div className="relative bg-white w-full max-w-lg max-h-[95vh] sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[48px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 border border-sky-100 flex flex-col">
            <div className="p-6 sm:p-10 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tightest italic leading-none">Mission Briefing</h3>
                  <div className="px-2 sm:px-3 py-1 bg-sky-600 text-white rounded-lg text-[7px] sm:text-[8px] font-black uppercase shadow-lg shadow-sky-200">
                    #{showItemsFor._id.slice(-6).toUpperCase()}
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] font-black text-sky-500 uppercase tracking-[0.4em]">Logistics Verification</p>
              </div>
              <button onClick={() => setShowItemsFor(null)} className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all shrink-0">
                <ChevronDown size={24} className="sm:hidden" />
                <XCircle size={24} className="hidden sm:block" />
              </button>
            </div>
            <div className="p-5 sm:p-8 flex-1 overflow-y-auto custom-scrollbar pb-32 sm:pb-8">
              {/* Address & Logistics Section */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-[#FFF9F0] rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 border border-[#FFEDD5]">
                  <p className="text-[8px] sm:text-[9px] font-black uppercase text-[#D97706] tracking-[0.2em] mb-1 sm:mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Package size={10} /> Pickup Location</span>
                    {currentCoords && showItemsFor.shopId?.location && (
                      <span className="text-[7px] sm:text-[8px] font-black text-white bg-[#D97706] px-2 py-0.5 rounded-full shadow-sm">
                        {getDistance(currentCoords.lat, currentCoords.lng, showItemsFor.shopId.location.lat, showItemsFor.shopId.location.lng)} KM AWAY
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] sm:text-[12px] font-black text-[#334155] uppercase leading-tight">
                    {showItemsFor.shopId?.name || 'Store'}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mt-1 leading-tight truncate">
                    {showItemsFor.shopId?.address || 'Main Branch'}
                  </p>
                </div>
                
                <div className="bg-[#F0F9FF] rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 border border-[#E0F2FE]">
                  <p className="text-[8px] sm:text-[9px] font-black uppercase text-[#0369A1] tracking-[0.2em] mb-1 sm:mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><MapPin size={10} /> Drop-off Destination</span>
                    {showItemsFor.shopId?.location && showItemsFor.deliveryLocation && (
                      <span className="text-[7px] sm:text-[8px] font-black text-white bg-[#0369A1] px-2 py-0.5 rounded-full shadow-sm">
                        {getDistance(showItemsFor.shopId.location.lat, showItemsFor.shopId.location.lng, showItemsFor.deliveryLocation.lat, showItemsFor.deliveryLocation.lng)} KM TRIP
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] sm:text-[12px] font-black text-[#334155] uppercase leading-tight">
                    {showItemsFor.customerName || 'Customer'}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mt-1 leading-tight">
                    {showItemsFor.deliveryAddress?.street}, {showItemsFor.deliveryAddress?.city}
                  </p>
                </div>
              </div>

              {/* Mission Payout Section */}
              <div className="bg-[#F0FDF4] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-[#DCFCE7] mb-6 sm:mb-8 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Zap size={14} />
                  </div>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase text-[#15803D] tracking-[0.3em]">Mission Financials</p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[6px] sm:text-[8px] font-black text-emerald-500/70 uppercase tracking-widest leading-none">Base</span>
                    <span className="text-lg sm:text-2xl font-black text-gray-900 italic tracking-tightest leading-none">₹{showItemsFor.deliveryFee || 0}</span>
                  </div>
                  <div className="h-8 sm:h-10 w-[1px] bg-emerald-100 mx-1 sm:mx-2" />
                  <div className="flex flex-col gap-0.5 sm:gap-1 text-center">
                    <span className="text-[6px] sm:text-[8px] font-black text-emerald-500/70 uppercase tracking-widest leading-none">Incentive</span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-500 italic tracking-tightest leading-none">+₹{showItemsFor.extraAmount || 0}</span>
                  </div>
                  <div className="h-8 sm:h-10 w-[1px] bg-emerald-100 mx-1 sm:mx-2" />
                  <div className="flex flex-col gap-0.5 sm:gap-1 text-right">
                    <span className="text-[6px] sm:text-[8px] font-black text-emerald-500/70 uppercase tracking-widest leading-none">Total Mission Payout</span>
                    <span className="text-lg sm:text-2xl font-black text-sky-600 italic tracking-tightest leading-none">₹{(showItemsFor.deliveryFee || 0) + (showItemsFor.extraAmount || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-1 sm:px-2">
                <div className="w-1 h-3 bg-sky-500 rounded-full" />
                <h4 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory List</h4>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {showItemsFor.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 sm:p-4 bg-sky-50/20 rounded-[24px] sm:rounded-[32px] border border-sky-100/30">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-[16px] sm:rounded-[20px] overflow-hidden border border-sky-100 shadow-sm shrink-0 p-1">
                        <img
                          src={item.productId?.imageUrl || item.image || 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-[12px] sm:rounded-[16px]"
                          onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'; }}
                        />
                      </div>

                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center font-black text-sky-600 border border-sky-100 shadow-inner shrink-0 text-[10px] sm:text-xs">
                        {item.quantity}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-[13px] font-black text-gray-900 uppercase tracking-tight leading-tight truncate">{item.name}</p>
                        <p className="text-[7px] sm:text-[9px] text-sky-400 font-black uppercase tracking-widest mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2">
                          <span className="text-sky-600">₹{item.price || 0}</span>
                          <span className="w-0.5 h-0.5 bg-sky-200 rounded-full" />
                          {item.unit}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 border border-emerald-100/50">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-white border-t border-gray-50 mt-auto shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-4 sm:mb-6 px-1 sm:px-2">
                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Value</span>
                <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter italic">₹{showItemsFor.totalPrice || 0}</span>
              </div>
              <button onClick={() => setShowItemsFor(null)} className="w-full h-14 sm:h-16 bg-gray-900 text-white rounded-[24px] sm:rounded-[28px] font-black uppercase text-[10px] sm:text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all">
                Briefing Verified
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
