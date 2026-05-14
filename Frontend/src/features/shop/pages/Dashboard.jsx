import React, { useState, useEffect, lazy, Suspense } from 'react';

import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { Package, TrendingUp, TrendingDown, Clock, AlertCircle, X, CheckCircle2, Loader2, Receipt, Eye, Volume2, Download, Play } from 'lucide-react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useQueryParam } from '../../../hooks/useQueryParam';

import { toast } from 'sonner';
const RevenueChart = lazy(() => import('../components/AnalyticsComponents').then(m => ({ default: m.RevenueChart })));
const CategoryPieChart = lazy(() => import('../components/AnalyticsComponents').then(m => ({ default: m.CategoryPieChart })));

import api from '../../../config/api.js';

const StatCard = ({ label, value, color, alert, trend }) => {
  return (
    <div className={`relative bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm overflow-hidden group hover:shadow-2xl hover:shadow-gray-200 transition-all`}>
      {alert && <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>}
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 relative z-10">{label}</p>
      <h3 className={`text-4xl font-black text-gray-900 tracking-tighter group-hover:${color ? color.replace('bg-', 'text-') : 'text-gray-900'} transition-colors relative z-10`}>{value}</h3>
      
      {trend !== undefined && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider relative z-10 ${trend >= 0 ? 'text-sky-500' : 'text-rose-500'}`}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(trend).toFixed(1)}% vs last mo</span>
        </div>
      )}

      <div className={`absolute -bottom-4 -right-4 w-24 h-24 ${color || 'bg-gray-100'} opacity-[0.03] group-hover:opacity-[0.1] rounded-full transition-all`}></div>
    </div>
  );
}

const Dashboard = () => {
  const { orders = [], products = [], deleteOrder } = useStore();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'staff') {
    return <Navigate to="/vendor/dashboard/billing" replace />;
  }
  const [shop, setShop] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showVideoDropdown, setShowVideoDropdown] = useState(false);

  // ── Video Guide State ──────────────────────────────────────────────
  // 🔧 TO UPDATE: Replace the YouTube video IDs below with your actual video IDs.
  // A YouTube video ID is the part after "?v=" in the URL.
  // Example: https://www.youtube.com/watch?v=ABC123xyz → ID is "ABC123xyz"
  const VIDEO_GUIDES = [
    {
      id: 'razorpay',
      title: 'Razorpay Integration',
      emoji: '💳',
      color: 'from-sky-400 to-sky-600',
      langs: {
        EN: 'dQw4w9WgXcQ', // ← Replace with English video ID
        HI: 'dQw4w9WgXcQ', // ← Replace with Hindi video ID
        KN: 'dQw4w9WgXcQ', // ← Replace with Kannada video ID
      }
    },
    {
      id: 'vendor',
      title: 'Full Vendor Guide',
      emoji: '🏪',
      color: 'from-sky-500 to-sky-700',
      langs: {
        EN: 'dQw4w9WgXcQ', // ← Replace with English video ID
        HI: 'dQw4w9WgXcQ', // ← Replace with Hindi video ID
        KN: 'dQw4w9WgXcQ', // ← Replace with Kannada video ID
      }
    }
  ];
  const [activeVideo, setActiveVideo] = useQueryParam('video', '');
  const [activeLang, setActiveLang] = useQueryParam('lang', 'EN');
  const currentVideo = VIDEO_GUIDES.find(v => v.id === activeVideo);
  const currentVideoId = currentVideo?.langs[activeLang];
  // ──────────────────────────────────────────────────────────────────

  const toggleShopStatus = async () => {
    if (!shop?._id) return;
    setIsTogglingStatus(true);
    try {
      const { data } = await api.patch(`/shops/${shop._id}/toggle`);
      setShop(data.shop);
      toast.success(`Shop is now ${data.isActive ? 'ONLINE' : 'OFFLINE'}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Polling every 30s to refresh orders (replaces Supabase realtime)
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      window.dispatchEvent(new CustomEvent('orders-updated'));
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const { data } = await api.get('/shops/my');
        if (data?.shop) setShop(data.shop);
      } catch (err) {
        console.error('Failed to fetch shop details:', err);
      }
    };
    if (user?.id) fetchShop();
  }, [user]);

  const shopId = shop?._id || shop?.id;
  // Context orders for vendors are already scoped to their shop by the backend
  const filteredOrders = (orders || []).filter(o => {
    const oShopId = o.shopId?._id || o.shopId || o.shop_id || o.shop?._id || o.shop;
    return !shopId || String(oShopId) === String(shopId);
  });
  const filteredProducts = (products || []).filter(p => {
    const pShopId = p.shop_id || p.shopId || p.shop?._id || p.shop;
    return String(pShopId) === String(shopId);
  });

  const todayOrders = filteredOrders.length;
  const pendingOrders = filteredOrders.filter(o => o.status === 'NEW' || o.status === 'PACKING').length;
  const completedOrders = filteredOrders.filter(o => o.status === 'COMPLETED');
  const revenue = completedOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || o.total_price || 0), 0);
  const b2bRevenueTotal = filteredOrders
    .filter(o => o.paymentMethod === 'PAY_LATER')
    .reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  // Trending Logic
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthRevenue = completedOrders
    .filter(o => new Date(o.createdAt || o.created_at) >= startOfCurrentMonth)
    .reduce((sum, o) => sum + (o.totalPrice || o.total || o.total_price || 0), 0);

  const lastMonthRevenue = completedOrders
    .filter(o => {
      const d = new Date(o.createdAt || o.created_at);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    })
    .reduce((sum, o) => sum + (o.totalPrice || o.total || o.total_price || 0), 0);

  const revenueTrend = lastMonthRevenue > 0 
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : null;
  
  const outOfStock = filteredProducts.filter(p => (Number(p.stockQuantity) <= 0)).length;

  // --- Analytics Data Calculation ---
  const getLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return getLocalDateString(d);
  }).reverse();
  const revenueChartData = last7Days.map(date => {
    const dayOrders = filteredOrders.filter(o => getLocalDateString(o.createdAt || o.created_at) === date);
    
    // Split into online, offline, and B2B
    // For Online/Offline, we only count COMPLETED orders as revenue
    // For B2B, we count the actual paidAmount regardless of order status
    const onlineOrders = dayOrders.filter(o => o.status === 'COMPLETED' && !o.isBill && o.paymentMethod !== 'PAY_LATER');
    const offlineOrders = dayOrders.filter(o => o.status === 'COMPLETED' && o.isBill);
    const b2bOrders = dayOrders.filter(o => o.status === 'COMPLETED' && o.paymentMethod === 'PAY_LATER');

    const onlineRevenue = onlineOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || o.total_price || 0), 0);
    const offlineRevenue = offlineOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || o.total_price || 0), 0);
    const b2bRevenue = b2bOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

    return { 
      date: date.split('-').slice(1).join('/'), 
      revenue: onlineRevenue + offlineRevenue + b2bRevenue, 
      onlineRevenue,
      offlineRevenue,
      b2bRevenue,
      orders: dayOrders.length,
      onlineCount: onlineOrders.length,
      offlineCount: offlineOrders.length,
      b2bCount: b2bOrders.length
    };
  });

  // --- Category Earning Analytics ---
  const categoryEarnings = filteredOrders
    .filter(o => o.status === 'COMPLETED')
    .reduce((acc, order) => {
      (order.items || []).forEach(item => {
        // Use category from item.product if available, or fall back to 'Uncategorized'
        const category = (item.product?.category || item.category || 'Uncategorized').toUpperCase();
        const price = Number(item.priceAtOrder || item.price || 0);
        const qty = Number(item.quantity || 0);
        const total = price * qty;
        acc[category] = (acc[category] || 0) + total;
      });
      return acc;
    }, {});

  const categoryPieData = Object.entries(categoryEarnings)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Show top 10 categories for scrolling

  const topCategory = categoryPieData.length > 0 ? categoryPieData[0].name : 'N/A';
  const topCategoryValue = categoryPieData.length > 0 ? categoryPieData[0].value : 0;

  const download7DayReport = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();

      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text(`${shop?.name || 'Store'} - 7 Day Performance Report`, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Period: ${revenueChartData[0].date} to ${revenueChartData[6].date}`, 14, 30);

      // Summary Table
      const tableRows = revenueChartData.map(day => [
        day.date,
        `Rs. ${day.onlineRevenue.toLocaleString()}`,
        day.onlineCount,
        `Rs. ${day.offlineRevenue.toLocaleString()}`,
        day.offlineCount,
        `Rs. ${day.revenue.toLocaleString()}`
      ]);

      doc.autoTable({
        startY: 40,
        head: [['Date', 'Online', 'Offline', 'Wholesale', 'Total']],
        body: revenueChartData.map(day => [
          day.date,
          `Rs. ${day.onlineRevenue.toLocaleString()}`,
          `Rs. ${day.offlineRevenue.toLocaleString()}`,
          `Rs. ${day.b2bRevenue.toLocaleString()}`,
          `Rs. ${day.revenue.toLocaleString()}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { fontStyle: 'bold' },
            4: { fontStyle: 'bold', textColor: [14, 165, 233] }
        }
      });

      // Detailed totals at the bottom
      const totalRev = revenueChartData.reduce((sum, d) => sum + d.revenue, 0);
      const totalOnlineRev = revenueChartData.reduce((sum, d) => sum + d.onlineRevenue, 0);
      const totalOfflineRev = revenueChartData.reduce((sum, d) => sum + d.offlineRevenue, 0);
      const totalOnlineQty = revenueChartData.reduce((sum, d) => sum + d.onlineCount, 0);
      const totalOfflineQty = revenueChartData.reduce((sum, d) => sum + d.offlineCount, 0);
      const totalOrders = totalOnlineQty + totalOfflineQty;
      
      const finalY = (doc).lastAutoTable?.finalY || 150;
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      
      // Breakdown Table at the bottom
      doc.autoTable({
        startY: finalY + 10,
        head: [['Channel', 'Total Orders', 'Total Revenue']],
        body: [
          ['Online Sales', totalOnlineQty, `Rs. ${totalOnlineRev.toLocaleString()}`],
          ['Offline Sales', totalOfflineQty, `Rs. ${totalOfflineRev.toLocaleString()}`],
          ['Wholesale (B2B - Paid)', orders.filter(o => o.paymentMethod === 'PAY_LATER').length, `Rs. ${b2bRevenueTotal.toLocaleString()}`],
          ['Grand Total (Paid)', totalOrders, `Rs. ${(totalOnlineRev + totalOfflineRev + b2bRevenueTotal).toLocaleString()}`]
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fontStyle: 'bold', borderBottom: 1 },
        columnStyles: {
          2: { fontStyle: 'bold' }
        }
      });

      const safeName = (shop?.name || 'Store').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeName}_7Day_Report.pdf`);
      toast.success("PDF Report Downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF Report");
    }
  };

  return (
    <div className="flex flex-col md:h-screen md:overflow-hidden min-h-screen p-2 md:p-4 bg-slate-50">

      {/* FIXED TOP SECTION: Header & Stats */}
      <div className="flex-none pr-4">
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-1">
              {shop?.name || 'My Store'}
            </h1>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2">
              {user?.role === 'staff' ? 'Staff Portal' : 'Store Performance'} • <Clock size={12} /> LIVE UPDATES
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {shop && user?.role === 'vendor' && (
              <button
                onClick={toggleShopStatus}
                disabled={isTogglingStatus}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] font-black text-[10px] uppercase tracking-widest border transition-all shadow-lg shadow-gray-200/50 active:scale-95 disabled:opacity-50 ${shop.is_active
                  ? 'bg-sky-600 text-white border-sky-500 hover:bg-sky-700'
                  : 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700'
                  }`}
              >
                {isTogglingStatus ? <Loader2 className="animate-spin" size={16} /> : shop.is_active ? <CheckCircle2 size={16} /> : <X size={16} />}
                {shop.is_active ? 'Store OPEN' : 'Store CLOSED'}
              </button>
            )}

            {user?.role === 'vendor' && (
              <div className="relative">
                <button
                  onClick={() => setShowVideoDropdown(!showVideoDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-[16px] font-black text-[10px] uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all shadow-lg shadow-gray-200/50"
                >
                  <Play size={16} className="text-sky-600" /> Video Guides
                </button>
                {showVideoDropdown && (
                  <>
                    <div className="fixed inset-0 z-[190]" onClick={() => setShowVideoDropdown(false)} />
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] p-2 animate-in zoom-in-95 slide-in-from-top-2 duration-200">
                      <p className="px-3 py-2 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Tutorial</p>
                      {VIDEO_GUIDES.map(v => (
                        <button
                          key={v.id}
                          onClick={() => { setActiveVideo(v.id); setShowVideoDropdown(false); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-sky-50 rounded-xl transition-all group"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${v.color} flex items-center justify-center text-xl shadow-sm shrink-0 group-hover:scale-110 transition-transform`}>
                            {v.emoji}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-none">{v.title}</p>
                            <p className="text-[7px] font-bold text-gray-400 uppercase mt-1">Multi-language</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {user?.role === 'vendor' && (
              <Link
                to="/vendor/dashboard/profile"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-[16px] font-black text-[10px] uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all shadow-lg shadow-gray-200/50"
              >
                <Eye size={16} /> Edit Shop
              </Link>
            )}

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-report-modal'))}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-[16px] font-black text-[10px] uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all shadow-lg shadow-gray-200/50"
            >
              <AlertCircle size={16} /> Report Issue
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-2 ${user?.role === 'staff' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4 mb-2`}>
          <StatCard label="Live Orders" value={pendingOrders} color="bg-sky-500" alert={pendingOrders > 0} />
          {user?.role === 'vendor' && (
            <StatCard label="Total Revenue" value={`₹${revenue.toLocaleString()}`} color="bg-sky-600" trend={revenueTrend} />
          )}
          {user?.role === 'vendor' && (
            <StatCard label="Wholesale Rev" value={`₹${b2bRevenueTotal.toLocaleString()}`} color="bg-sky-700" />
          )}
          <StatCard label="Out of Stock" value={outOfStock} color="bg-rose-50" alert={outOfStock > 0} />
        </div>
      </div>

      {/* Analytics & Guides */}
      <div className="flex-1 md:overflow-y-auto custom-scrollbar pb-4 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Revenue Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col p-4 md:p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-black text-xl text-gray-900 tracking-tight uppercase leading-none">Revenue Growth</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Historical trends for the last 7 days</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={download7DayReport}
                  className="flex items-center gap-2 bg-sky-600 text-white px-4 py-1.5 rounded-xl border border-sky-500 hover:bg-sky-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-100"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
            <div className="flex-1 mt-6 min-h-[260px] relative min-w-0">
              {revenueChartData.length > 0 ? (
                <Suspense fallback={<div className="animate-pulse bg-gray-50 rounded-2xl w-full h-full" />}>
                  <RevenueChart data={revenueChartData} />
                </Suspense>
              ) : (

                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  No revenue data available
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Video Guides */}
          {/* Right Panel: Category Earnings */}
          <div className="lg:col-span-1 bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col p-4 md:p-6 h-full min-h-0">
            <div className="mb-2 shrink-0">
              <h2 className="font-black text-xl text-gray-900 tracking-tight uppercase leading-none">Category Sales</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Revenue by product type</p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar-visible pr-2 h-[350px]">
              <div className="h-[220px] shrink-0 flex items-center justify-center">
                {categoryPieData.length > 0 ? (
                  <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-full w-32 h-32" />}>
                    <CategoryPieChart data={categoryPieData} hideLegend={true} />
                  </Suspense>
                ) : (

                  <div className="text-center p-10 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                      <TrendingUp size={32} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Sales Data Available</p>
                  </div>
                )}
              </div>

              {/* Manual Scrollable Legend */}
              <div className="mt-4 space-y-1">
                {categoryPieData.map((item, idx) => {
                  const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9D84B7'];
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight group-hover:text-gray-900 transition-colors">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-900 tabular-nums">₹{item.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 shrink-0">
               <div className="flex items-center justify-between p-3 bg-sky-50/50 rounded-2xl border border-sky-100">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm">
                        ★
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Best Performer</p>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter mt-1">{topCategory}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xs font-black text-sky-600 tracking-tighter">₹{topCategoryValue.toLocaleString()}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

          {/* Fullscreen Video Modal */}
          {activeVideo && (
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8"
              style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
              onClick={() => setActiveVideo(null)}
            >
              <div
                className="w-full max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-300"
                style={{ maxHeight: '92vh' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${currentVideo?.color}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currentVideo?.emoji}</span>
                    <div>
                      <p className="text-white font-black text-sm uppercase tracking-widest leading-none">{currentVideo?.title}</p>
                      <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">Select language below</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="w-9 h-9 bg-white/20 hover:bg-white/40 rounded-xl flex items-center justify-center text-white transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* Language Tabs */}
                <div className="flex gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
                  {['EN', 'HI', 'KN'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                        activeLang === lang
                          ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {lang === 'EN' ? '🇬🇧 English' : lang === 'HI' ? '🇮🇳 Hindi' : '🌿 Kannada'}
                    </button>
                  ))}
                  <p className="ml-auto text-[9px] text-gray-400 font-bold uppercase tracking-widest self-center italic">Click outside to close</p>
                </div>

                {/* YouTube Embed */}
                <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    key={`${activeVideo}-${activeLang}`}
                    src={`https://www.youtube.com/embed/${currentVideoId}?rel=0&modestbranding=1&autoplay=1`}
                    title={currentVideo?.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  );
};

export default Dashboard;
