import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useStore } from '../../shop/context/StoreContext';
import { toast } from 'sonner';
import { UserCheck, Map, ArrowRight, Loader2, Users, Globe, Calendar, Clock, AlertTriangle, Send, X, Truck, PackageCheck, Navigation } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend } from 'recharts';
import api from '../../../config/api.js';

const SuperAdminDashboard = () => {
   const { token } = useAuth();
   const { isDeliveryMode } = useStore();
   const navigate = useNavigate();
   const [shops, setShops] = useState([]);
   const [users, setUsers] = useState([]);
   const [reports, setReports] = useState([]);
   const [adminStats, setAdminStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleData, setScheduleData] = useState({
       scheduledTime: '',
       message: 'The update will go at [time], so don\'t do any payment or placing order.',
       isActive: true
    });
    const [submittingSchedule, setSubmittingSchedule] = useState(false);

   useEffect(() => {
      if (token) {
         fetchAllData();
      }
   }, [token]);

    const fetchAllData = async () => {
       setLoading(true);
       try {
          const [shopsRes, usersRes, reportsRes, systemRes, statsRes] = await Promise.all([
             api.get('/admin/shops'),
             api.get('/admin/users'),
             api.get('/admin/reports'),
             api.get('/admin/system-settings'),
             api.get('/admin/stats')
          ]);

          setShops(shopsRes.data?.shops || []);
          setUsers(usersRes.data?.users || []);
          setReports(reportsRes.data?.reports || []);
          
          if (systemRes.data?.settings) {
             const s = systemRes.data.settings;
             setScheduleData({
                scheduledTime: s.scheduledTime ? new Date(s.scheduledTime).toISOString().slice(0, 16) : '',
                message: s.message || 'The update will go at [time], so don\'t do any payment or placing order.',
                isActive: s.isActive ?? true
             });
          }

          if (statsRes.data?.stats) {
             setAdminStats(statsRes.data.stats);
          }

       } catch (err) {
          console.error("Dashboard sync error:", err);
          toast.error("Network synchronization failed");
       } finally {
          setLoading(false);
       }
    };

    const handleScheduleSubmit = async (e) => {
       e.preventDefault();
       if (!scheduleData.scheduledTime) return toast.error("Select update time");
       
       setSubmittingSchedule(true);
       try {
          await api.patch('/admin/system-settings', scheduleData);
          
          toast.success("Update scheduled successfully");
          setShowScheduleModal(false);
       } catch (err) {
          toast.error("Failed to schedule update");
       } finally {
          setSubmittingSchedule(false);
       }
    };

   const stats = useMemo(() => {
      return {
         totalShops: adminStats.totalShops ?? 0,
         totalCustomers: adminStats.totalUsers ?? 0,
         pending: adminStats.pendingVendors ?? 0,
         reports: reports.length
      };
   }, [adminStats, reports]);


   // Dual Registration Aggregator (Vendors & Users)
   const getGrowthData = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const last6Months = [];

      for (let i = 5; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         last6Months.push({
            month: months[d.getMonth()],
            monthIdx: d.getMonth(),
            year: d.getFullYear(),
            vendors: 0,
            users: 0
         });
      }

      shops.forEach(s => {
         const date = new Date(s.created_at);
         const mIdx = last6Months.findIndex(m => m.monthIdx === date.getMonth() && m.year === date.getFullYear());
         if (mIdx !== -1) last6Months[mIdx].vendors++;
      });

      users.forEach(u => {
         if (u.role !== 'customer') return; // ONLY count customers in this bar

         const date = new Date(u.created_at);
         const mIdx = last6Months.findIndex(m => m.monthIdx === date.getMonth() && m.year === date.getFullYear());
         if (mIdx !== -1) last6Months[mIdx].users++;
      });

      return last6Months;
   };

   const growthData = getGrowthData();
   const currentVendors = growthData[growthData.length - 1].vendors;
   const currentUsers = growthData[growthData.length - 1].users;

   if (loading) return <RegistrationSkeleton />;

   return (
      <div className="min-h-screen w-full space-y-4 pb-4 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-4">
                  <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                    Platform <span className="text-sky-500">Growth</span>
                  </h1>
                  <span className="px-3 py-1 bg-sky-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-sky-100">
                    Network Owner
                  </span>
               </div>
               <p className="text-[9px] font-black text-sky-600/60 uppercase tracking-[0.2em] mt-1">
                  Network Expansion • Live Metrics
               </p>
            </div>

            <button 
               onClick={() => setShowScheduleModal(true)}
               className="flex items-center justify-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-900 transition-all active:scale-95 shadow-sm w-full md:w-auto"
            >
               <Calendar size={16} />
               Schedule Update
            </button>
         </div>

         {!isDeliveryMode ? (
            <>
               {/* Compact Stats Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <GlobalStat label="Global Vendors" value={stats.totalShops} color="sky" />
                  <GlobalStat label="Total Customers" value={stats.totalCustomers} color="emerald" />
                  <GlobalStat label="Pending Approval" value={stats.pending} color="sky" alert={stats.pending > 0} />
               </div>

               {/* Streamlined Growth Chart */}
               <div className="w-full bg-gray-900 rounded-[32px] p-6 shadow-xl border border-white/5 relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col gap-6">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                           <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase">Growth <span className="text-sky-400">Analytics</span></h2>
                           <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Registration Streams</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Vendors (+{currentVendors})</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Customers (+{currentUsers})</span>
                           </div>
                        </div>
                     </div>

                     <div style={{ height: '200px', width: '100%', minHeight: '200px' }} className="mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={growthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <defs>
                                 <linearGradient id="vendorGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.8} />
                                 </linearGradient>
                                 <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.8} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                              <XAxis
                                 dataKey="month"
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fontSize: 9, fontWeight: 800, fill: '#FFFFFF' }}
                                 dy={10}
                              />
                              <YAxis
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fontSize: 9, fontWeight: 800, fill: '#FFFFFF' }}
                              />
                              <Tooltip
                                 cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                 content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                       return (
                                          <div className="bg-gray-900 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-1">
                                                {payload[0].payload.month} report
                                             </p>
                                             <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-6">
                                                   <span className="text-[9px] font-black text-sky-400 uppercase">Vendors</span>
                                                   <span className="text-sm font-black text-white">{payload[0].value}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-6">
                                                   <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Users</span>
                                                   <span className="text-sm font-black text-white">{payload[1].value}</span>
                                                </div>
                                             </div>
                                          </div>
                                       );
                                    }
                                    return null;
                                 }}
                              />
                              <Bar
                                 dataKey="vendors"
                                 fill="url(#vendorGrad)"
                                 radius={[4, 4, 4, 4]}
                                 barSize={16}
                                 animationDuration={1000}
                              />
                              <Bar
                                 dataKey="users"
                                 fill="url(#userGrad)"
                                 radius={[4, 4, 4, 4]}
                                 barSize={16}
                                 animationDuration={1200}
                              />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </>
         ) : (
            <>
               {/* Logistics Mode Stats */}
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <GlobalStat label="Active Fleet" value={adminStats.totalRiders || 0} color="indigo" />
                  <GlobalStat label="Pending Delivery" value={adminStats.activeDeliveries || 0} color="amber" alert={adminStats.activeDeliveries > 0} />
                  <GlobalStat label="Today's Fulfillment" value={adminStats.completedDeliveriesToday || 0} color="emerald" />
               </div>

               {/* Logistics Overview */}
               <div className="w-full bg-white rounded-[32px] p-6 shadow-xl border border-indigo-50 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                        <div>
                           <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase leading-none">Fleet Operations</h2>
                           <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Real-time status</p>
                        </div>
                        <Navigation className="text-indigo-600 animate-pulse" size={20} />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-indigo-200" onClick={() => navigate('/super-admin/orders')}>
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                 <Truck size={16} />
                              </div>
                              <p className="text-[10px] font-black text-slate-900 uppercase">View Shipments</p>
                           </div>
                           <ArrowRight size={14} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-sky-200" onClick={() => navigate('/super-admin/delivery')}>
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-sky-500 text-white rounded-xl flex items-center justify-center">
                                 <PackageCheck size={16} />
                              </div>
                              <p className="text-[10px] font-black text-slate-900 uppercase">Manage Fleet</p>
                           </div>
                           <ArrowRight size={14} className="text-sky-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </div>
                  </div>
               </div>
            </>
         )}

         {/* Schedule Update Modal */}
         {showScheduleModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="p-8">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Schedule Update</h3>
                           <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mt-1">Control Window</p>
                        </div>
                        <button onClick={() => setShowScheduleModal(false)} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                           <X size={16} />
                        </button>
                     </div>

                     <form onSubmit={handleScheduleSubmit} className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Start Time</label>
                           <input 
                              type="datetime-local" 
                              required
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-50 rounded-xl text-[10px] font-bold focus:bg-white focus:border-sky-500/20 outline-none transition-all"
                              value={scheduleData.scheduledTime}
                              onChange={e => setScheduleData({...scheduleData, scheduledTime: e.target.value})}
                           />
                        </div>

                        <div className="space-y-1">
                           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Broadcast Message</label>
                           <textarea 
                              rows="2"
                              className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-xl text-[10px] font-bold focus:bg-white focus:border-sky-500/20 outline-none transition-all resize-none"
                              value={scheduleData.message}
                              onChange={e => setScheduleData({...scheduleData, message: e.target.value})}
                           />
                           <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1 ml-2">Tip: You can use "[time]" as a placeholder.</p>
                        </div>

                        {/* Preview Section */}
                        {scheduleData.scheduledTime && (
                           <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 animate-in fade-in zoom-in-95">
                              <p className="text-[8px] font-black text-sky-600 uppercase tracking-widest mb-3 text-center">Banner Preview</p>
                              <div className="flex flex-col items-center gap-1 mb-3">
                                 <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">
                                    {new Date(scheduleData.scheduledTime).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                 </p>
                                 <p className="text-[9px] font-bold text-sky-600 uppercase">
                                    at {new Date(scheduleData.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                              </div>
                              <p className="text-[9px] font-bold text-gray-600 text-center uppercase tracking-tight leading-relaxed">
                                 {scheduleData.message.replace('[time]', new Date(scheduleData.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
                              </p>
                           </div>
                        )}

                        <button 
                           type="submit"
                           disabled={submittingSchedule}
                           className="w-full h-12 bg-gray-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-sky-600 transition-all shadow-xl disabled:opacity-50"
                        >
                           {submittingSchedule ? <Loader2 className="animate-spin" size={16} /> : <Send size={14} />}
                           {submittingSchedule ? 'Processing' : 'Commit Schedule'}
                        </button>
                     </form>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const GlobalStat = ({ label, value, color, alert, onClick }) => {
   return (
      <div
         onClick={onClick}
         className={`bg-white rounded-[24px] p-6 border border-gray-50 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500 ${onClick ? 'cursor-pointer' : ''}`}
      >
         {alert && <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>}
         <div className="relative z-10">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter transition-all duration-500 group-hover:text-sky-500">{value}</h3>
         </div>
         <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-sky-50 rounded-full opacity-30 transition-all duration-700 group-hover:scale-150"></div>
      </div>
   );
}

const RegistrationSkeleton = () => (
   <div className="h-screen w-full bg-slate-50 p-8 space-y-6 animate-pulse overflow-hidden">
      <div className="h-10 w-64 bg-gray-200 rounded-xl"></div>
      <div className="grid grid-cols-3 gap-4">
         {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl"></div>)}
      </div>
      <div className="h-full bg-gray-900 rounded-[32px]"></div>
   </div>
);

export default SuperAdminDashboard;
