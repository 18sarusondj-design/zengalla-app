import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Gift, Clock, Info, Copy, Check, Store, Trash2, Coins, Sparkles } from 'lucide-react';
import api from '../../../config/api.js';

const ShopNotifications = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getNotifications } = useStore();
  const [shop, setShop] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Persistent dismissed IDs from localStorage
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`dismissedAlerts_${shopId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    fetchShopData();
  }, [shopId, user?.id]);

  useEffect(() => {
    localStorage.setItem(`dismissedAlerts_${shopId}`, JSON.stringify(dismissedIds));
  }, [dismissedIds, shopId]);

  const fetchShopData = async () => {
    try {
      // Fetch Shop Info
      const { data } = await api.get(`/shops/${shopId}`);
      if (data && data.shop) {
        setShop(data.shop);
        setCoupons(data.shop.coupons || []);
      }

      // Fetch Personal Notifications
      if (user?._id || user?.id) {
        const personalNotifs = await getNotifications(user._id || user.id, shopId);
        setNotifications(personalNotifs);
      }

    } catch (err) {
      console.error("Error fetching notification data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id) => {
    setDismissedIds(prev => [...prev, id]);
    toast.info("Notification cleared");
  };


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Coupon code copied!");
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
    </div>
  );

  const filteredCoupons = coupons.filter(c => !dismissedIds.includes(c._id));
  const announcementId = `announcement-${shopId}`;
  const isAnnouncementDismissed = dismissedIds.includes(announcementId);

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      {/* Premium Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-all active:scale-90"
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Notifications</h1>
        </div>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        {/* Personal Notifications Section */}
        {notifications.length > 0 && notifications.filter(n => !dismissedIds.includes(n._id)).length > 0 && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-sky-500 fill-sky-500/20" />
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Personal Rewards</h2>
            </div>
            <div className="space-y-4">
              {notifications.filter(n => !dismissedIds.includes(n._id)).map(n => (
                <div key={n._id} className="bg-gradient-to-br from-indigo-50 to-sky-50 border-2 border-indigo-100 p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -translate-y-12 translate-x-12 blur-3xl"></div>
                  
                  <button 
                    onClick={() => handleDismiss(n._id)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-indigo-700 hover:bg-red-500 hover:text-white transition-all shadow-sm group-hover:scale-110 active:scale-90 z-20"
                    title="Dismiss Notification"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex gap-4 items-start relative z-10">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                      <Coins size={24} />
                    </div>
                    <div className="pr-8">
                      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1 leading-none">{n.title || 'Gift For You'}</p>
                      <p className="text-sm font-black text-gray-900 leading-tight mt-2">{n.message}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-3 flex items-center gap-1.5"><Clock size={10} /> {new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shop Announcement Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-sky-500 fill-sky-500/20" />
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Shop Announcements</h2>
          </div>

          {shop?.footerMessage && !isAnnouncementDismissed ? (
            <div className="bg-sky-50 border-2 border-sky-100 p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full -translate-y-12 translate-x-12 blur-2xl"></div>
              
              <button 
                onClick={() => handleDismiss(announcementId)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-sky-700 hover:bg-red-500 hover:text-white transition-all shadow-sm group-hover:scale-110 active:scale-90 z-20"
                title="Delete Notification"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex gap-4 items-start relative z-10">
                <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-200">
                  <Bell size={24} />
                </div>
                <div className="pr-8">
                  <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-1 leading-none">Official Update</p>
                  <p className="text-sm font-bold text-gray-800 leading-relaxed mt-2">{shop.footerMessage}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 p-10 rounded-[32px] text-center flex flex-col items-center gap-3">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">No active announcements</p>
            </div>
          )}
        </section>

        {/* Coupons Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} className="text-sky-500 fill-sky-500/20" />
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Active Offers & Coupons</h2>
          </div>

          {filteredCoupons.length > 0 ? (
            <div className="grid gap-4">
              {filteredCoupons.map(coupon => (
                <div key={coupon._id} className="bg-white border-2 border-dashed border-sky-200 p-5 rounded-[32px] flex items-center justify-between gap-4 group hover:border-sky-500 transition-all shadow-sm relative overflow-hidden">
                  
                  <button 
                    onClick={() => handleDismiss(coupon._id)}
                    className="absolute top-4 right-4 w-8 h-8 opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90 z-20"
                    title="Delete Coupon"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="relative z-10 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-600 rounded-full border border-sky-100 text-[8px] font-black uppercase tracking-widest mb-2">
                       {coupon.discountType === 'PERCENT' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                    </div>
                    <p className="text-lg font-black text-gray-900 tracking-tight uppercase leading-none">{coupon.code}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[8px] text-gray-400 font-bold uppercase">Min Order ₹{coupon.minOrderAmount}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => copyToClipboard(coupon.code)}
                    className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all transform group-hover:scale-110 shadow-sm border border-sky-100"
                  >
                    <Copy size={20} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 p-10 rounded-[32px] text-center flex flex-col items-center gap-3">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">No active coupons</p>
            </div>
          )}
        </section>

        {/* Info Section */}
        <div className="bg-blue-50/50 rounded-[32px] p-6 border border-blue-100 flex gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shrink-0">
             <Info size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 leading-none">Pro Tip</p>
            <p className="text-[11px] font-bold text-gray-600 leading-relaxed italic">Stay updated on flash sales and new releases by checking this page frequently!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopNotifications;
