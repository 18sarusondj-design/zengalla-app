import React, { useState, useMemo } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { User, Phone, CreditCard, ArrowRight, Search, TrendingDown, CheckCircle2, History as HistoryIcon, Filter } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const CreditLedger = () => {
  const { orders, shop, fetchOrders } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('B2B');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSettling, setIsSettling] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('CASH');

  // Group orders by customer phone
  const ledger = useMemo(() => {
    const groups = {};
    orders.forEach(order => {
      const phone = order.phone || 'GUEST';
      if (!groups[phone]) {
        groups[phone] = {
          phone,
          name: order.customerName || 'Walk-in',
          businessName: order.customerBusinessName || '',
          isB2B: !!order.customerBusinessName,
          totalOrders: 0,
          totalCredit: 0,
          orders: []
        };
      }
      groups[phone].totalOrders += 1;
      groups[phone].totalCredit += (order.balanceDue || 0);
      groups[phone].orders.push(order);
    });
    return Object.values(groups);
  }, [orders]);

  const filteredLedger = ledger.filter(item => {
    const isSearchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.phone.includes(searchTerm) ||
                          item.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    return item.isB2B && isSearchMatch && item.totalCredit > 0;
  });

  const handleSettleBalance = async () => {
    if (!selectedCustomer || !settleAmount || parseFloat(settleAmount) <= 0) return;
    
    setIsSettling(true);
    try {
      // Find orders with balanceDue > 0 and pay them off one by one (or the oldest first)
      let remainingSettle = parseFloat(settleAmount);
      const creditOrders = [...selectedCustomer.orders]
        .filter(o => o.balanceDue > 0)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (const order of creditOrders) {
        if (remainingSettle <= 0) break;
        const payForThis = Math.min(remainingSettle, order.balanceDue);
        await api.patch(`/orders/${order._id || order.id}/payment`, {
          paidAmount: payForThis,
          paymentMethod: settleMethod
        });
        remainingSettle -= payForThis;
      }

      toast.success(`Settled ₹${settleAmount} for ${selectedCustomer.name}`);
      setSelectedCustomer(null);
      setSettleAmount('');
      if (fetchOrders) await fetchOrders();
    } catch (err) {
      toast.error("Settlement failed");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase italic">Credit Ledger</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-1">Manage B2B Partner Outstanding Balances</p>
        </div>
        
        {/* Tab removal */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
            <TrendingDown className="text-sky-600 mb-4 relative z-10" size={32} />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Total Receivables</h3>
            <p className="text-3xl font-black text-gray-900 tracking-tighter relative z-10">
              ₹{ledger.reduce((acc, curr) => acc + curr.totalCredit, 0).toFixed(2)}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search Name/Phone..." 
              className="w-full bg-white border-2 border-gray-50 focus:border-sky-500 rounded-[24px] py-4 pl-12 pr-6 text-sm font-bold shadow-sm outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="px-8 py-6">Customer / Business</th>
                  <th className="px-8 py-6">Contact</th>
                  <th className="px-8 py-6 text-center">Orders</th>
                  <th className="px-8 py-6 text-right">Balance Due</th>
                  <th className="px-8 py-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLedger.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-black">
                          {item.name[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.name}</h4>
                          {item.businessName && <p className="text-[9px] font-bold text-sky-500 uppercase tracking-widest mt-0.5">{item.businessName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                        <Phone size={12} className="text-gray-300" />
                        {item.phone}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-3 py-1 rounded-full">{item.totalOrders}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-gray-900 tracking-tighter">₹{item.totalCredit.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedCustomer(item)}
                        className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-gray-200"
                      >Settle</button>
                    </td>
                  </tr>
                ))}
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                       <CheckCircle2 size={48} className="mx-auto text-emerald-100 mb-4" />
                       <p className="text-lg font-black text-gray-900 uppercase tracking-tight">All Clear!</p>
                       <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">No outstanding balances found in this section.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settlement Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Settle Balance</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Payment for {selectedCustomer.name}</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Outstanding</span>
                <span className="text-xl font-black text-gray-900">₹{selectedCustomer.totalCredit.toFixed(2)}</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Settlement Amount</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border-2 border-transparent focus:border-sky-500 rounded-2xl p-4 text-lg font-black text-gray-900 shadow-sm outline-none transition-all"
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={e => setSettleAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CASH', 'ONLINE'].map(m => (
                      <button 
                        key={m}
                        onClick={() => setSettleMethod(m)}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${settleMethod === m ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                      >{m}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest border border-gray-100"
              >Cancel</button>
              <button 
                disabled={isSettling || !settleAmount}
                onClick={handleSettleBalance}
                className="flex-[2] bg-gray-900 text-white py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-sky-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSettling ? <HistoryIcon size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditLedger;
