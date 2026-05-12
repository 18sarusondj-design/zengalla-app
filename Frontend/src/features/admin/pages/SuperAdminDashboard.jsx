import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { UserCheck, Map, ArrowRight, Loader2, Users, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend } from 'recharts';
import api from '../../../config/api.js';

const SuperAdminDashboard = () => {
   const { token } = useAuth();
   const navigate = useNavigate();
   const [shops, setShops] = useState([]);
   const [users, setUsers] = useState([]);
   const [reports, setReports] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (token) {
         fetchAllData();
      }
   }, [token]);

   const fetchAllData = async () => {
      setLoading(true);
      try {
         const [shopsRes, usersRes, reportsRes] = await Promise.all([
            api.get('/admin/shops'),
            api.get('/admin/users'),
            api.get('/admin/reports')
         ]);

         setShops(shopsRes.data?.shops || []);
         setUsers(usersRes.data?.users || []);
         setReports(reportsRes.data?.reports || []);

      } catch (err) {
         console.error("Dashboard sync error:", err);
         toast.error("Network synchronization failed");
      } finally {
         setLoading(false);
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
      <div className="h-full w-full space-y-8 pb-10 animate-in fade-in duration-700">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
            <div>
               <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-7xl font-black text-gray-900 tracking-tighter uppercase leading-none">Platform Growth</h1>
                  <span className="px-4 py-1.5 bg-sky-500 text-white text-xs font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-sky-200 animate-pulse mt-4">Network Owner</span>
               </div>
               <p className="text-sm font-black text-sky-600 uppercase tracking-[0.4em] flex items-center gap-3">
                  Network Expansion • <Globe size={16} /> Live Stream
               </p>
            </div>
         </div>

         {/* Modern Stats Grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlobalStat label="Global Vendors" value={stats.totalShops} color="sky" />
            <GlobalStat label="Total Customers" value={stats.totalCustomers} color="emerald" />
            <GlobalStat label="Pending Approval" value={stats.pending} color="sky" alert={stats.pending > 0} />
         </div>

         {/* Dual Stream Growth Chart - The New Primary Focus */}
         <div className="w-full bg-gray-900 rounded-[48px] p-10 shadow-2xl shadow-gray-200/50 border border-white/5 relative overflow-hidden group">
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

               <div style={{ height: '280px', width: '100%', minHeight: '280px' }} className="mt-2">
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
