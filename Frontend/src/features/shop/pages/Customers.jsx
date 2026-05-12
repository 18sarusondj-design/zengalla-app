import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { User, Phone, Zap, Calendar, MessageSquare, TrendingUp, Users, Clock, Search, Filter, ArrowUpRight, X, Trophy, Gift, Star, Award, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const Customers = () => {
  const { getCustomers, sendNotification, vendorShop, updateShop } = useStore();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'staff') {
    return <Navigate to="/vendor/dashboard" replace />;
  }
  const [customers, setCustomers] = useState([]);
  const [counts, setCounts] = useState({ online: 0, offline: 0 });
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [shop, setShop] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({ threshold: 0, pointVal: 0 });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!vendorShop?._id && !vendorShop?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchShop()]);
      setLoading(false);
    };
    fetchData();
  }, [vendorShop?._id, vendorShop?.id]);

  const fetchShop = async () => {
    try {
      if (vendorShop) {
        setShop(vendorShop);
        setSettingsData({
          threshold: vendorShop.vipPointThreshold || 1000,
          pointVal: vendorShop.vipPointValue || 10
        });
      }
    } catch (err) {
      console.error("Failed to fetch shop settings");
    }
  };

  const fetchCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data.customers || []);
    setCounts({ online: data.onlineCount || 0, offline: data.offlineCount || 0 });
  };

  const threshold = shop?.vipPointThreshold || 1000;
  const pointVal = shop?.vipPointValue || 10;

  const vipCustomers = customers
    .filter(c => (c.totalSpent || 0) >= threshold)
    .map(c => {
        const lifetimeEarned = Math.floor(c.totalSpent / threshold);
        const availablePoints = Math.max(0, lifetimeEarned - (c.totalRedeemed || 0));
        return {
            ...c,
            points: availablePoints,
            rewardValue: availablePoints * pointVal
        };
    })
    .filter(c => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search);
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(vipCustomers.length / itemsPerPage);
  const paginatedCustomers = vipCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSendReward = async (cust) => {
    if (!cust.userId) {
      toast.error('This customer is not registered on the app yet.');
      return;
    }
    
    setIsSending(cust.userId);
    try {
      const message = `You have ${cust.points} points and you can use it. Keep shopping at ${shop?.name || 'our shop'}!`;
      const success = await sendNotification(cust.userId, shop._id || shop.id, message, 'Loyalty Reward Points');
      if (success) {
        toast.success(`Notification sent to ${cust.name || 'customer'}!`);
      }
    } catch (err) {
      // error handled in StoreContext
    } finally {
      setIsSending(null);
    }
  };

  const handleManualWhatsApp = (cust) => {
    const phone = cust.phone;
    const finalPhone = phone.replace(/\D/g, '').length === 10 ? `91${phone.replace(/\D/g, '')}` : phone.replace(/\D/g, '');
    const msg = `Hi ${cust.name || 'valued customer'}, thank you for shopping at ${shop?.name || 'our shop'}. You have ${cust.points || 0} loyalty points available for your next purchase! 🎉`;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleUpdateSettings = async () => {
    setIsSavingSettings(true);
    try {
      const result = await updateShop({
        vipPointThreshold: Number(settingsData.threshold),
        vipPointValue: Number(settingsData.pointVal)
      });

      if (result.success) {
        setShop(result.data);
        setIsEditingSettings(false);
        toast.success('Loyalty settings updated!');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 rounded-[40px] border border-slate-200/50 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primaryLight/30 text-brand-primary rounded-full mb-3">
             <Award size={14} fill="currentColor" />
             <span className="text-[10px] font-black uppercase tracking-wider">Loyalty Program</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase leading-none">VIP Reward Program</h1>
          <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-[0.2em]">Rewarding our top spenders (₹{threshold.toLocaleString()}+)</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Search VIP members by name..." 
                    className="h-14 bg-white border-2 border-transparent focus:border-brand-primary/30 rounded-2xl pl-12 pr-6 text-sm font-bold text-gray-900 shadow-xl shadow-gray-200/50 focus:outline-none transition-all w-full md:w-80"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative z-10 flex-1 min-h-0">
        {/* Left Sidebar: Metrics */}
        <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-4 pr-2">
          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center">
                 <Trophy size={24} fill="currentColor" opacity={0.2} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total VIPs</p>
                  <h2 className="text-3xl font-black text-gray-900 leading-none">{vipCustomers.length}</h2>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase italic">Spending ≥ ₹{threshold.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-brand-primaryLight text-brand-primary rounded-2xl flex items-center justify-center">
                 <Star size={24} fill="currentColor" opacity={0.2} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Points Pool</p>
                  <h2 className="text-3xl font-black text-gray-900 leading-none">{vipCustomers.reduce((acc, curr) => acc + curr.points, 0)}</h2>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase italic">Available loyalty points</p>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group transition-all mb-4 relative overflow-hidden shrink-0">
            <div className="flex flex-col gap-1 relative z-10">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Program Settings</p>
                 <button 
                  onClick={() => setIsEditingSettings(!isEditingSettings)}
                  className="text-[9px] font-black text-brand-primary uppercase tracking-widest hover:underline"
                 >
                   {isEditingSettings ? 'Cancel' : 'Edit'}
                 </button>
               </div>

               {isEditingSettings ? (
                 <div className="space-y-3 animate-in fade-in zoom-in duration-200">
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Min Spend (₹)</label>
                      <input 
                        type="number" min="0"
                        className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-brand-primary"
                        value={settingsData.threshold}
                        onChange={(e) => setSettingsData({...settingsData, threshold: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">1 Point Value (₹)</label>
                      <input 
                        type="number" min="0"
                        className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-brand-primary"
                        value={settingsData.pointVal}
                        onChange={(e) => setSettingsData({...settingsData, pointVal: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={handleUpdateSettings}
                      disabled={isSavingSettings}
                      className="w-full h-10 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 active:scale-95 disabled:opacity-50"
                    >
                      {isSavingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                 </div>
               ) : (
                 <>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">Min Spend</span>
                     <span className="text-[11px] font-black text-gray-900">₹{threshold}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">1 Point =</span>
                     <span className="text-[11px] font-black text-gray-900">₹{pointVal}</span>
                   </div>
                 </>
               )}
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50/50 rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Content: Registry */}
        <div className="flex-1 bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col relative z-10">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                  <Users size={18} className="text-brand-primary" /> 
                  VIP Customer Registry
              </h3>
              <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                  {vipCustomers.length} ACTIVE MEMBERS
              </span>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {vipCustomers.length > 0 ? (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement</th>
                            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Loyalty</th>
                            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedCustomers.map((cust, idx) => (
                            <tr key={cust.phone} className="group hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${idx < 3 ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (cust.name || 'U').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-900 text-xs leading-none mb-1 truncate max-w-[120px]">{cust.name || 'Valued Member'}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cust.phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-5">
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase truncate mb-1 max-w-[150px]">{cust.email || 'No email'}</p>
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-black text-slate-800 text-[10px] uppercase tracking-tighter">₹{(cust.totalSpent || 0).toLocaleString()}</p>
                                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">{cust.orderCount || 0} Orders</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Zap size={12} className="text-sky-500 fill-sky-500" />
                                        <span className="font-black text-gray-900 text-xs">{cust.points}</span>
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pts</span>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {cust.userId ? (
                                            <button 
                                                onClick={() => handleSendReward(cust)}
                                                disabled={isSending === cust.userId}
                                                className="h-9 px-4 bg-brand-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/10 active:scale-95 disabled:opacity-50"
                                            >
                                                {isSending === cust.userId ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Zap size={12} className="fill-white" />
                                                        Reward
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <span className="text-[8px] font-black uppercase text-gray-300 tracking-tighter">Guest</span>
                                        )}
                                        <button 
                                            onClick={() => handleManualWhatsApp(cust)}
                                            className="w-9 h-9 border-2 border-emerald-100 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-90 shrink-0"
                                            title="Direct WhatsApp"
                                        >
                                            <MessageSquare size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6">
                      <Users className="text-gray-200" size={48} />
                  </div>
                  <p className="text-xl font-black text-gray-900 mb-2 uppercase">No VIPs Yet</p>
                  <p className="text-sm text-gray-400 font-bold max-w-xs">Customers will appear here once they spend more than ₹{threshold.toLocaleString()} in your shop.</p>
              </div>
            )}
          </div>
          {vipCustomers.length > 0 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={vipCustomers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Customers;
