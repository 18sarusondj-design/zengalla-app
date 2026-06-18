import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingBag, IndianRupee, Loader2,
  CreditCard, ChevronRight, Store, Calendar, CheckCircle2,
  Package, Receipt, AlertCircle, Trash2
} from 'lucide-react';
import api from '../../../config/api.js';

const cardPalettes = [
  { bg: 'from-violet-500 to-sky-700', badge: 'bg-violet-400/20 text-violet-100', date: 'text-violet-200' },
  { bg: 'from-rose-500 to-pink-700', badge: 'bg-rose-400/20 text-rose-100', date: 'text-rose-200' },
  { bg: 'from-sky-400 to-sky-600', badge: 'bg-sky-300/20 text-sky-100', date: 'text-sky-100' },
  { bg: 'from-cyan-500 to-blue-700', badge: 'bg-cyan-300/20 text-cyan-100', date: 'text-cyan-200' },
  { bg: 'from-emerald-500 to-teal-700', badge: 'bg-emerald-300/20 text-emerald-100', date: 'text-emerald-200' },
];

const Dues = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [creditOrders, setCreditOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // selected order detail

  useEffect(() => {
    if (token && user) fetchCredits();
  }, [token, user]);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders/my?paymentStatus=PARTIAL,PENDING,CREDIT');
      if (data && data.orders) {
        setCreditOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch dues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, orderId) => {
    if (e) e.stopPropagation();

    const order = creditOrders.find(o => (o._id || o.id) === orderId);
    if (order) {
      const paid = order.paidAmount !== undefined ? order.paidAmount : (order.amountPaid || 0);
      const total = order.totalPrice || order.total || 0;
      const due = order.balanceDue !== undefined && order.balanceDue !== 0
        ? order.balanceDue
        : Math.max(0, total - paid);

      if (due > 0) {
        toast.error("Outstanding dues cannot be deleted", {
          description: `Please pay the remaining balance of ₹${due.toLocaleString()} first.`,
        });
        return;
      }
    }

    toast.error("Confirm removal from history?", {
      description: "This will hide the record from your view.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const { data } = await api.delete(`/orders/${orderId}`);
            if (data.success) {
              setCreditOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
              if (selected && (selected._id === orderId || selected.id === orderId)) setSelected(null);
              toast.success("Record removed");
            }
          } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Failed to remove record");
          }
        }
      }
    });
  };

  const totalDue = creditOrders.reduce((s, o) => {
    const paid = o.paidAmount !== undefined ? o.paidAmount : (o.amountPaid || 0);
    const total = o.totalPrice || o.total || 0;
    const due = o.balanceDue !== undefined && o.balanceDue !== 0
      ? o.balanceDue
      : Math.max(0, total - paid);
    return s + due;
  }, 0);

  // ─── DETAIL VIEW ───────────────────────────────────────────────
  if (selected) {
    const order = selected;
    // Normalize field names (Order uses paidAmount, Bill uses amountPaid)
    const paidAmount = order.paidAmount !== undefined ? order.paidAmount : (order.amountPaid || 0);
    const totalPrice = order.totalPrice || order.total || 0;
    const balanceDue = order.balanceDue !== undefined && order.balanceDue !== 0
      ? order.balanceDue
      : Math.max(0, totalPrice - paidAmount);

    const paidPct = totalPrice > 0 ? Math.round((paidAmount / totalPrice) * 100) : 0;
    const isPartial = order.paymentStatus === 'PARTIAL';

    return (
      <div className="min-h-screen w-full bg-slate-50">

        {/* Header */}
        <div className="w-full sticky top-0 z-50 overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1e0a3c 0%,#3b1584 55%,#1e0a3c 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(167,139,250,0.2) 0%,transparent 70%)', transform: 'translate(40%,-55%)' }} />
          <div className="relative flex items-center justify-between px-4 sm:px-8 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)}
                className="w-10 h-10 bg-slate-100/10 hover:bg-slate-100/20 text-white rounded-2xl flex items-center justify-center transition-all">
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              {balanceDue === 0 && (
                <button onClick={() => handleDelete(null, order._id)}
                  className="w-10 h-10 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-2xl flex items-center justify-center transition-all">
                  <Trash2 size={18} strokeWidth={2} />
                </button>
              )}
            </div>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.35em]">Bill Detail</p>
            <div className="w-9 h-9" />
          </div>

          {/* Shop + date in header */}
          <div className="relative px-4 sm:px-8 pb-7">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate mb-1">
              {order.shopId?.name || 'General Merchant'}
            </h1>
            <div className="flex items-center gap-2">
              <Calendar size={11} className="text-violet-300" />
              <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">
                {new Date(order.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className={`ml-2 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isPartial ? 'bg-blue-500/20 text-blue-200' : 'bg-sky-500/20 text-sky-200'}`}>
                {isPartial ? 'Partial Payment' : 'Credit Order'}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Total */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bill</p>
              <p className="text-lg font-black text-gray-900 tracking-tight">₹{totalPrice.toLocaleString()}</p>
            </div>
            {/* Paid */}
            <div className="rounded-2xl p-4 text-white text-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <p className="text-[8px] font-black text-emerald-100/70 uppercase tracking-widest mb-1">Paid</p>
              <p className="text-lg font-black tracking-tight">₹{paidAmount.toLocaleString()}</p>
            </div>
            {/* Due */}
            <div className="rounded-2xl p-4 text-white text-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#f43f5e,#be185d)' }}>
              <p className="text-[8px] font-black text-rose-100/70 uppercase tracking-widest mb-1">Remaining</p>
              <p className="text-lg font-black tracking-tight">₹{balanceDue.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payment Progress</span>
              <span className="text-[9px] font-black text-emerald-600">{paidPct}% Paid</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${paidPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
            </div>
          </div>

          {/* Items Purchased */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
                <Package size={15} className="text-violet-600" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Items Purchased</h3>
            </div>

            {order.items && order.items.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {order.items.map((item, i) => {
                  const name = item.product?.name || item.name || 'Product';
                  const qty = item.quantity || 1;
                  const price = item.price || 0;
                  return (
                    <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                          <ShoppingBag size={14} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">₹{price} × {qty}</p>
                        </div>
                      </div>
                      <p className="font-black text-gray-900 text-sm shrink-0">₹{(price * qty).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No item details available</p>
              </div>
            )}

            {/* Totals footer */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-bold">
                <span>Subtotal</span>
                <span>₹{(order.subtotal || totalPrice).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Settlement Info */}
          <div className="rounded-[24px] p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b1584)' }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle,rgba(167,139,250,0.15) 0%,transparent 70%)', transform: 'translate(40%,-50%)' }} />
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center shrink-0 text-sky-400">
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="font-black text-white text-sm mb-1">How to settle this due</h4>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                  Visit <span className="text-violet-300">{order.shopId?.name || 'the store'}</span> and pay ₹{balanceDue.toLocaleString()} at the counter. The amount will be cleared automatically once the vendor records it.
                </p>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-slate-50">

      {/* Hero Header */}
      <div className="w-full sticky top-0 z-50 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1e0a3c 0%,#3b1584 55%,#1e0a3c 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(167,139,250,0.25) 0%,transparent 70%)', transform: 'translate(40%,-55%)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.15) 0%,transparent 70%)', transform: 'translate(-35%,55%)' }} />

        <div className="relative flex items-center justify-between px-4 sm:px-8 pt-5 pb-2">
          <button onClick={() => navigate('/profile')}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center transition-all">
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.35em]">Credit Ledger</p>
          <div className="w-9 h-9" />
        </div>

        <div className="relative px-4 sm:px-8 pt-4 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[9px] font-black text-violet-300 uppercase tracking-[0.3em] mb-2">Outstanding Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter">₹{totalDue.toLocaleString()}</span>
                <span className="text-xs font-black text-white/30 uppercase tracking-widest">INR</span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">{creditOrders.length}</p>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-0.5">Invoices</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {new Set(creditOrders.map(o => o.shopId?._id).filter(Boolean)).size}
                </p>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-0.5">Stores</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] shrink-0">Pending Bills</h2>
          <div className="flex-1 h-px bg-gray-200" />
          {creditOrders.length > 0 && (
            <span className="text-[9px] font-black text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full uppercase tracking-widest shrink-0">
              {creditOrders.length} Active
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-gray-100">
              <Loader2 size={30} className="text-violet-500 animate-spin" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing Records...</p>
          </div>

        ) : creditOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditOrders.map((order, i) => {
              const pal = cardPalettes[i % cardPalettes.length];
              const paid = order.paidAmount !== undefined ? order.paidAmount : (order.amountPaid || 0);
              const total = order.totalPrice || order.total || 0;
              const due = order.balanceDue !== undefined && order.balanceDue !== 0
                ? order.balanceDue
                : Math.max(0, total - paid);
              const isPartial = order.paymentStatus === 'PARTIAL';
              return (
                <div key={order._id} onClick={() => setSelected(order)}
                  className={`relative bg-gradient-to-br ${pal.bg} rounded-[28px] p-5 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer overflow-hidden group`}>
                  <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-500" />
                  <div className="relative flex items-start justify-between mb-5">
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <ShoppingBag size={18} />
                    </div>
                    <div className="flex items-center gap-2">
                      {due === 0 && (
                        <button
                          onClick={(e) => handleDelete(e, order._id)}
                          className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center backdrop-blur-sm transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${pal.badge} border border-white/10`}>
                        {isPartial ? 'Partial' : 'Credit'}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-black text-base uppercase tracking-tight truncate mb-1">
                    {order.shopId?.name || 'General Merchant'}
                  </h4>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${pal.date} mb-4`}>
                    <Calendar size={9} className="inline mr-1 mb-px" />
                    {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Balance Due</p>
                      <p className="text-3xl font-black tracking-tighter">₹{due.toLocaleString()}</p>
                    </div>
                    <div className="w-8 h-8 bg-white/15 border border-white/10 rounded-full flex items-center justify-center group-hover:bg-white/25 transition-all">
                      <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[28px] flex items-center justify-center mb-5 shadow-lg shadow-emerald-200">
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">All Clear!</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed max-w-[240px]">
              No outstanding payments. Your credit account is fully settled.
            </p>
          </div>
        )}

        {/* Info card */}
        <div className="rounded-[28px] p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b1584)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(167,139,250,0.15) 0%,transparent 70%)', transform: 'translate(35%,-50%)' }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center shrink-0 text-sky-400">
              <IndianRupee size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-black uppercase tracking-tight mb-1.5 text-base">How to Clear Your Dues</h4>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                Settle payments directly at the store. Once the vendor records your payment, it disappears automatically.
                <span className="text-violet-300 ml-1">Each store maintains its own independent credit ledger.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default Dues;
