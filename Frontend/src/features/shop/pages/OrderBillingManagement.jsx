import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { 
  Search, Filter, Calendar, IndianRupee, Clock, CheckCircle2, 
  XCircle, ArrowLeft, Download, Printer, MessageCircle, 
  MoreVertical, Eye, FileText, ChevronDown, ChevronUp,
  CreditCard, Banknote, History, ExternalLink, Loader2,
  Trash2, Edit3, Save, X, AlertCircle, ShoppingBag
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../../config/api';
import { exportToCSV, generateGSTReport } from '../../../utils/exportUtils';
import Pagination from '../../common/components/Pagination';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReceiptTemplate from '../../shop/components/ReceiptTemplate';
import { renderToStaticMarkup } from 'react-dom/server';

const OrderBillingManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vendorShop } = useStore();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentStatus: 'All',
    orderStatus: 'All',
    buyerPhone: searchParams.get('buyerPhone') || ''
  });
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        shopId: vendorShop._id,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.paymentStatus !== 'All' && { paymentStatus: filters.paymentStatus }),
        ...(filters.orderStatus !== 'All' && { status: filters.orderStatus }),
        ...(filters.buyerPhone && { buyerPhone: filters.buyerPhone })
      }).toString();

      const res = await api.get(`/orders?${query}`);
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorShop?._id) {
      fetchOrders();
    }
  }, [vendorShop, filters]);

  const handleWhatsAppShare = () => {
    if (!selectedOrder) return;
    const billId = (selectedOrder._id || selectedOrder.id || '').toString();
    const shortId = billId ? billId.slice(-6).toUpperCase() : 'N/A';
    const msg = `🧾 *THANK YOU FOR SHOPPING!* \n\n` +
                `*Store:* ${vendorShop?.name || 'STORE'}\n` +
                `*Bill:* #${shortId}\n` +
                `*Total:* Rs. ${selectedOrder.totalPrice}\n` +
                `*Balance:* Rs. ${selectedOrder.balanceDue}`;
    const phone = selectedOrder.phone || '91';
    const finalPhone = phone.replace(/\D/g, '').length === 10 ? `91${phone.replace(/\D/g, '')}` : phone.replace(/\D/g, '');
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    toast.info("Generating PDF Invoice...");
    const element = document.getElementById('receipt-download-hidden');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${selectedOrder.invoiceNumber || 'Order'}.pdf`);
      toast.success("Invoice Downloaded");
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
  };

  const handlePrintLabel = () => {
    toast.info("Connecting to Thermal Printer...");
    window.print();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'READY': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'OUT_FOR_DELIVERY': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'PAID': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PARTIAL': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'CREDIT': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchStr = searchQuery.toLowerCase();
    return (
      (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(searchStr)) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchStr)) ||
      (order.customerBusinessName && order.customerBusinessName.toLowerCase().includes(searchStr)) ||
      (order.phone && order.phone.includes(searchStr))
    );
  });

  const handlePartialPayment = async () => {
    if (!partialAmount || isNaN(partialAmount)) return toast.error("Enter a valid amount");
    if (Number(partialAmount) > selectedOrder.balanceDue) return toast.error("Amount exceeds balance due");

    setIsProcessing(true);
    try {
      const res = await api.patch(`/orders/${selectedOrder._id}/payment`, {
        paidAmount: Number(partialAmount),
        paymentMethod: 'CASH', // Default to cash for manual settlements
        note: paymentNote
      });

      if (res.data.success) {
        toast.success(`Payment of ₹${partialAmount} recorded`);
        setPartialAmount('');
        setPaymentNote('');
        fetchOrders(); // Refresh list
        setIsActionDrawerOpen(false); // Close drawer
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/vendor/dashboard')} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-sky-600 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Billing History</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Audit billing, payments and reconciliation</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => {
                   if (!filters.startDate || !filters.endDate) return toast.error("Select date range first");
                   exportToCSV(filteredOrders, `Ledger_${filters.startDate}_to_${filters.endDate}`);
                }}
                className="bg-sky-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-sky-100 hover:bg-sky-700 transition-all flex items-center gap-2"
             >
                <Download size={16} /> Download Ledger
             </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Orders</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Invoice #, Buyer..."
                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-bold text-xs"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Range</label>
            <div className="flex bg-slate-50 rounded-2xl p-1 gap-1 border border-slate-100">
               <input 
                 type="date" className="flex-1 px-3 py-3 bg-white rounded-xl font-bold text-[10px] uppercase outline-none"
                 value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})}
               />
               <div className="flex items-center text-slate-300 font-bold text-[8px]">TO</div>
               <input 
                 type="date" className="flex-1 px-3 py-3 bg-white rounded-xl font-bold text-[10px] uppercase outline-none"
                 value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})}
               />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
            <select 
              className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-xs appearance-none cursor-pointer"
              value={filters.paymentStatus} onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
            >
              <option value="All">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="CREDIT">Credit / Pending</option>
            </select>
          </div>
          <button 
            onClick={() => setFilters({startDate: '', endDate: '', paymentStatus: 'All', orderStatus: 'All', buyerPhone: ''})}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-slate-100"
          >
            Clear Filters
          </button>
        </div>

        {/* Orders Table Container */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
            <table className="w-full border-collapse sticky-header">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-5 text-left">Invoice / Date</th>
                  <th className="px-6 py-5 text-left">Buyer Detail</th>
                  <th className="px-6 py-5 text-center">Amount</th>
                  <th className="px-6 py-5 text-center">Taxes</th>
                  <th className="px-6 py-5 text-center">Payment Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="7" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-sky-600" size={40} /></td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="7" className="p-20 text-center"><p className="text-slate-400 font-bold uppercase tracking-widest">No matching orders found</p></td></tr>
                ) : paginatedOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm tracking-tight uppercase">#{order.invoiceNumber || order._id.slice(-6).toUpperCase()}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm uppercase">{order.customerBusinessName || order.customerName}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{order.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">₹{order.totalPrice.toLocaleString()}</span>
                        {order.balanceDue > 0 && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Due: ₹{order.balanceDue.toLocaleString()}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="font-bold text-slate-400 text-xs tracking-tight">₹{(order.items?.reduce((acc, i) => acc + (i.price * i.quantity * 0.05), 0) || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="flex justify-end gap-2 transition-all">
                          <button 
                            onClick={() => { setSelectedOrder(order); setIsActionDrawerOpen(true); }}
                            className="p-2.5 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm shadow-sky-50"
                            title="View Receipt"
                          >
                             <Eye size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredOrders.length}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Action Drawer */}
      {isActionDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Order Actions</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Invoice #{selectedOrder.invoiceNumber || selectedOrder._id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setIsActionDrawerOpen(false)} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
               {/* Quick Info */}
               <div className="bg-sky-50 p-6 rounded-[32px] border border-sky-100">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest opacity-60">Total Bill</span>
                     <span className="text-2xl font-black text-sky-600 tracking-tighter">₹{selectedOrder.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest opacity-60">Balance Due</span>
                     <span className="text-2xl font-black text-rose-600 tracking-tighter">₹{selectedOrder.balanceDue.toLocaleString()}</span>
                  </div>
               </div>

               {/* Add Partial Payment */}
               {selectedOrder.balanceDue > 0 && (
                 <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                       <CreditCard size={14} /> Record Payment
                    </h3>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="number" placeholder="Enter amount..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-black text-xl text-slate-900 transition-all"
                        value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
                      />
                    </div>
                    <textarea 
                      placeholder="Add a payment note (optional)..."
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-xs resize-none h-24 transition-all"
                      value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                    ></textarea>
                    <button 
                      onClick={handlePartialPayment}
                      disabled={isProcessing}
                      className="w-full py-5 bg-sky-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Record Settlement
                    </button>
                 </div>
               )}

               {/* Shortcuts */}
               <div className="space-y-3 pt-4">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4">Sharing & Records</h3>
                  <button 
                    onClick={handleWhatsAppShare}
                    className="w-full p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-emerald-50 transition-all group"
                  >
                     <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <MessageCircle size={20} />
                     </div>
                     <div className="text-left">
                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">WhatsApp Receipt</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Share digital copy instantly</p>
                     </div>
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    className="w-full p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-sky-50 transition-all group"
                  >
                     <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all">
                        <Download size={20} />
                     </div>
                     <div className="text-left">
                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Download PDF</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Save professional invoice</p>
                     </div>
                  </button>
                  <button 
                    onClick={handlePrintLabel}
                    className="w-full p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-all group"
                  >
                     <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Printer size={20} />
                     </div>
                     <div className="text-left">
                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Print Label</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Thermal printer format</p>
                     </div>
                  </button>
               </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
               <button 
                 onClick={() => {
                    const el = document.getElementById('receipt-download-hidden');
                    if (el) {
                       const printWindow = window.open('', '_blank');
                       printWindow.document.write('<html><head><title>Print Receipt</title></head><body>');
                       printWindow.document.write(el.innerHTML);
                       printWindow.document.write('</body></html>');
                       printWindow.document.close();
                       printWindow.print();
                    }
                 }}
                 className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-sky-600 transition-all shadow-xl"
               >
                 Print Professional Invoice <Printer size={18} />
               </button>
            </div>

            {/* Hidden Receipt for PDF Generation */}
            <div className="hidden">
               <div id="receipt-download-hidden" className="p-10 bg-white">
                  <ReceiptTemplate data={selectedOrder} shop={vendorShop} />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBillingManagement;
