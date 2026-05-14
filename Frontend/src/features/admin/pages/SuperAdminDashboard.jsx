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
          const formattedMessage = scheduleData.message.replace('[time]', new Date(scheduleData.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          
          await api.patch('/admin/system-settings', {
             ...scheduleData,
             message: formattedMessage
          });
          
          toast.success("Update scheduled successfully");
          setShowScheduleModal(false);
       } catch (err) {
          toast.error("Failed to schedule update");
       } finally {
          setSubmittingSchedule(false);
       }
    };

   const stats = useMemo(() => {
      const nonAdminUsers = users.filter(u => {
         const isMasterEmail = u.email?.toLowerCase() === 'sarusondj@gmail.com'.toLowerCase();
         return u.role !== 'admin' && !isMasterEmail;
      });
      return {
         totalShops: shops.length,
         totalCustomers: users.filter(u => u.role === 'customer' && u.email?.toLowerCase() !== 'sarusondj@gmail.com'.toLowerCase()).length,
         pending: shops.filter(s => !s.isActive).length,
         reports: reports.length
      };
   }, [shops, users, reports]);


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
         const isMasterEmail = u.email?.toLowerCase() === 'sarusondj@gmail.com'.toLowerCase();
         if (u.role !== 'customer' || isMasterEmail) return; // ONLY count customers in this bar

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
      <div className="min-h-screen w-full space-y-8 pb-10 animate-in fade-in duration-700">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
            <div>
               <div className="flex items-center gap-4 mb-2">
                   <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase leading-none">Platform Growth</h1>
                  <span className="px-4 py-1.5 bg-sky-500 text-white text-xs font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-sky-200 animate-pulse mt-4">Network Owner</span>
               </div>
                <p className="text-sm font-black text-sky-600 uppercase tracking-[0.4em] flex items-center gap-3">
                   Network Expansion • <Globe size={16} /> Live Stream
                </p>
             </div>

             <button 
               onClick={() => setShowScheduleModal(true)}
               className="flex items-center gap-3 bg-gray-900 text-white px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-sky-600 transition-all shadow-2xl active:scale-95 group"
             >
                <Calendar size={18} className="group-hover:rotate-12 transition-transform" />
                Schedule System Update
             </button>
          </div>
          {!isDeliveryMode ? (
            <>
              {/* Modern Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <GlobalStat label="Global Vendors" value={stats.totalShops} color="sky" />
                <GlobalStat label="Total Customers" value={stats.totalCustomers} color="emerald" />
                <GlobalStat label="Pending Approval" value={stats.pending} color="sky" alert={stats.pending > 0} />
              </div>

              {/* Dual Stream Growth Chart */}
              <div className="w-full bg-gray-900 rounded-[32px] md:rounded-[48px] p-6 md:p-10 shadow-2xl shadow-gray-200/50 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-[120px] -mr-48 -mt-48 transition-all group-hover:scale-110"></div>

                <div className="relative z-10 flex flex-col gap-10">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                         <h2 className="text-3xl font-black tracking-tight text-white uppercase">Growth Analytics</h2>
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Comparing Vendor entry vs User registrations</p>
                      </div>
                      <div className="flex items-center gap-6 bg-white/5 p-4 rounded-3xl border border-white/5">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendors (+{currentVendors} this month)</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customers (+{currentUsers} this month)</span>
                         </div>
                      </div>
                   </div>

                   <div style={{ height: '280px', width: '100%', minHeight: '280px' }} className="mt-2 overflow-x-auto custom-scrollbar">
                      <div style={{ minWidth: '600px', height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                           <BarChart data={growthData} margin={{ top: 20, right: 0, left: 0, bottom: 40 }}>
                              <defs>
                                 <linearGradient id="vendorGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.6} />
                                 </linearGradient>
                                 <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.6} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                              <XAxis
                                 dataKey="month"
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                                 dy={10}
                              />
                              <YAxis
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                              />
                              <Tooltip
                                 cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                 content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                       return (
                                          <div className="bg-gray-900 border border-white/10 p-5 rounded-[24px] shadow-2xl backdrop-blur-xl">
                                             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
                                                {payload[0].payload.month} {payload[0].payload.year} report
                                             </p>
                                             <div className="space-y-4">
                                                <div className="flex items-center justify-between gap-8">
                                                   <span className="text-[10px] font-black text-sky-500 uppercase">Vendors</span>
                                                   <span className="text-xl font-black text-white">{payload[0].value}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-10">
                                                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Customers</span>
                                                   <span className="text-2xl font-black text-white">{payload[1].value}</span>
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
                                 radius={[10, 10, 10, 10]}
                                 barSize={24}
                                 animationDuration={1500}
                              />
                              <Bar
                                 dataKey="users"
                                 fill="url(#userGrad)"
                                 radius={[10, 10, 10, 10]}
                                 barSize={24}
                                 animationDuration={2000}
                              />
                           </BarChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Logistics Mode Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <GlobalStat label="Active Fleet" value={adminStats.totalRiders || 0} color="indigo" />
                <GlobalStat label="Pending Delivery" value={adminStats.activeDeliveries || 0} color="amber" alert={adminStats.activeDeliveries > 0} />
                <GlobalStat label="Today's Fulfillment" value={adminStats.completedDeliveriesToday || 0} color="emerald" />
              </div>

              {/* Logistics Map Placeholder / Overview */}
              <div className="w-full bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 shadow-xl border border-indigo-50 relative overflow-hidden group">
                 <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                       <div>
                          <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Fleet Live Stream</h2>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Real-time logistics synchronization</p>
                       </div>
                       <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                          <Navigation className="animate-pulse" size={24} />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-center gap-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Truck size={20} />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Dispatch Center</p>
                                <p className="text-sm font-black text-slate-900 uppercase">Ready for Assignment</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => navigate('/super-admin/orders')}
                            className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            View Active Shipments
                          </button>
                       </div>

                       <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-center gap-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
                                <PackageCheck size={20} />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fulfillment Health</p>
                                <p className="text-sm font-black text-slate-900 uppercase">System Operational</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => navigate('/super-admin/delivery')}
                            className="w-full py-4 bg-white text-sky-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-sky-100 hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                          >
                            Manage Delivery Fleet
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            </>
          )}


          {/* Schedule Update Modal */}
          {showScheduleModal && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
                   <div className="p-10">
                      <div className="flex items-center justify-between mb-8">
                         <div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Schedule Update</h3>
                            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">Maintenance Window Control</p>
                         </div>
                         <button onClick={() => setShowScheduleModal(false)} className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                            <X size={20} />
                         </button>
                      </div>

                      <form onSubmit={handleScheduleSubmit} className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Update Start Time</label>
                            <div className="relative">
                               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                               <input 
                                 type="datetime-local" 
                                 required
                                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-xs font-bold focus:bg-white focus:border-sky-500/20 outline-none transition-all"
                                 value={scheduleData.scheduledTime}
                                 onChange={e => setScheduleData({...scheduleData, scheduledTime: e.target.value})}
                               />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">User Broadcast Message</label>
                            <div className="relative">
                               <textarea 
                                 rows="3"
                                 className="w-full p-6 bg-gray-50 border-2 border-gray-50 rounded-2xl text-xs font-bold focus:bg-white focus:border-sky-500/20 outline-none transition-all resize-none"
                                 placeholder="Enter message..."
                                 value={scheduleData.message}
                                 onChange={e => setScheduleData({...scheduleData, message: e.target.value})}
                               />
                               <p className="text-[8px] text-gray-400 font-bold mt-2 ml-2 uppercase italic">Use [time] as placeholder for selected time</p>
                            </div>
                         </div>

                         <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p className="text-[9px] font-bold uppercase tracking-tight leading-relaxed">
                               This will display a one-time notification to all users upon app launch.
                            </p>
                         </div>

                         <button 
                           type="submit"
                           disabled={submittingSchedule}
                           className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-sky-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                         >
                            {submittingSchedule ? <Loader2 className="animate-spin" size={20} /> : (
                               <>Confirm Schedule <Send size={16} /></>
                            )}
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
         className={`bg-white rounded-[32px] p-8 border border-gray-50 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all ${onClick ? 'cursor-pointer' : ''}`}
      >
         {alert && <div className="absolute top-6 right-6 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>}
         <div className="flex items-start justify-between">
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">{label}</p>
               <h3 className={`text-4xl font-black text-gray-900 tracking-tighter group-hover:text-${color}-600 transition-colors`}>{value}</h3>
            </div>
            {onClick && (
               <div className={`mt-2 w-8 h-8 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0`}>
                  <ArrowRight size={16} />
               </div>
            )}
         </div>
         <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-${color}-50 rounded-full opacity-50 transition-all group-hover:scale-150`}></div>
      </div>
   );
}

const RegistrationSkeleton = () => (
   <div className="h-screen w-full bg-slate-50 p-12 space-y-8 animate-pulse overflow-hidden">
      <div className="h-16 w-96 bg-gray-200 rounded-2xl"></div>
      <div className="grid grid-cols-4 gap-6">
         {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-3xl"></div>)}
      </div>
      <div className="h-full bg-gray-900 rounded-[48px]"></div>
   </div>
);

export default SuperAdminDashboard;
