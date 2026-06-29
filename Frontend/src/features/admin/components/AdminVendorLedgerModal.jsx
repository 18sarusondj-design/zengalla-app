import React, { useState, useEffect } from 'react';
import { X, Loader2, Banknote, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import api from '../../../config/api';

const AdminVendorLedgerModal = ({ shop, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAdminLedger = async () => {
      try {
        const res = await api.get(`/ledger/admin-view/${shop._id || shop.id}`);
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (shop) fetchAdminLedger();
  }, [shop]);

  if (!shop) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
              <Banknote size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter line-clamp-1">{shop.name}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Financial Ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="animate-spin text-sky-500" size={32} />
            </div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Banknote size={100} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding Dues</p>
                  <h3 className="text-3xl font-black text-rose-500 tracking-tighter">₹{data.currentOutstanding.toFixed(2)}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">Vendor has not settled this amount yet.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                    <CheckCircle size={100} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Settled</p>
                  <h3 className="text-3xl font-black text-emerald-500 tracking-tighter">₹{data.lifetimeSettled.toFixed(2)}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">Total amount vendor has paid to platform.</p>
                </div>
              </div>

              {/* Settlement History */}
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-4">Settlement History</h3>
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {data.settlements.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p className="font-black text-xs uppercase tracking-widest">No past settlements</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Payment ID</th>
                          <th className="px-4 py-3 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {data.settlements.map((txn) => (
                          <tr key={txn._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600 font-bold">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                {new Date(txn.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                              {txn.paymentId}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600">
                              + ₹{txn.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-rose-500 font-black">
              Error Loading Data
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

// Re-usable check circle since it was missing above
const CheckCircle = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default AdminVendorLedgerModal;
