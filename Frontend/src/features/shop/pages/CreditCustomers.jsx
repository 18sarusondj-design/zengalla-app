import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { 
  Users, Phone, Mail, Shield, Plus, X, Search, 
  Trash2, Loader2, Save, ExternalLink, UserPlus, Edit3, Eye, 
  ShoppingBag, IndianRupee, CreditCard, Calendar, ArrowRight,
  TrendingUp, Clock, CheckCircle, CheckCircle2, Check, Wallet, Download
} from 'lucide-react';
import api from '../../../config/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const CreditCustomers = () => {
  const { token } = useAuth();
  const { vendorShop, orders, fetchOrders, setOrders, deleteOrder, updateShop, updateOrderPayment } = useStore();
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [viewingPartner, setViewingPartner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settlingOrder, setSettlingOrder] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [payLaterPartners, setPayLaterPartners] = useState([]);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    imageUrl: ''
  });

  const fetchPartners = async () => {
    try {
      if (!vendorShop?.id && !vendorShop?._id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setPayLaterPartners(vendorShop.payLaterPartners || []);
    } catch (err) {
      console.error("Failed to fetch credit customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
    if (vendorShop?._id || vendorShop?.id) {
      fetchOrders();
    }
  }, [vendorShop?._id, vendorShop?.id]);

  const handleOpenAdd = () => {
    setEditingPartner(null);
    setFormData({ name: '', phone: '', email: '', imageUrl: '' });
    setImageFile(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      phone: partner.phone || '',
      email: partner.email || '',
      imageUrl: partner.imageUrl || ''
    });
    setImageFile(null);
    setIsAdding(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.phone.length !== 10) return toast.error("Enter a valid 10-digit phone number");
    
    setIsSaving(true);
    try {
      let finalFormData = { ...formData };

      // Handle Image Upload if file selected
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const { data: res } = await api.post('/upload/image', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalFormData.imageUrl = res.url;
      }

      let updatedPartners;
      
      if (editingPartner) {
        updatedPartners = payLaterPartners.map(p => 
          p.phone === editingPartner.phone ? { ...p, ...finalFormData } : p
        );
      } else {
        if (payLaterPartners.some(p => p.phone === finalFormData.phone)) {
           toast.error("This phone number is already whitelisted");
           setIsSaving(false);
           return;
        }
        updatedPartners = [...payLaterPartners, { ...finalFormData, addedAt: new Date() }];
      }
      
      const result = await updateShop({ payLaterPartners: updatedPartners });

      if (result.success) {
        setPayLaterPartners(result.data.payLaterPartners);
        setIsAdding(false);
        setEditingPartner(null);
        setFormData({ name: '', phone: '', email: '', imageUrl: '' });
        toast.success(editingPartner ? "Customer updated successfully!" : "Pay Later customer added!");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(14, 165, 233);
      doc.text('CREDIT LEDGER REPORT', 14, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Shop: ${vendorShop?.name || 'My Store'}`, 14, 33);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);
      doc.text(`Total Credit Customers: ${payLaterPartners.length}`, 14, 43);

      const tableColumn = ["Customer Name", "Contact", "Total Orders", "Outstanding Bal"];
      const tableRows = payLaterPartners.map(p => {
        const activity = orders.filter(o => o.phone === p.phone && o.paymentMethod === 'PAY_LATER');
        const outstanding = activity
          .filter(o => o.paymentStatus !== 'PAID')
          .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
          
        return [
          p.name || 'Unnamed',
          p.phone,
          activity.length,
          `Rs. ${outstanding.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 53,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 53 }
      });

      doc.save(`credit_ledger_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Credit ledger report generated');
    } catch (err) {
      console.error("PDF Error:", err);
      toast.error('Failed to generate report');
    }
  };

  const handlePhoneLookup = async (phone) => {
    if (phone.length < 10) return;
    
    setIsLookingUp(true);
    setIsUserVerified(false);
    try {
      const { data } = await api.get(`/auth/lookup?phone=${phone}`);
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          email: data.email || prev.email,
          phone: data.phone || phone
        }));
        setIsUserVerified(true);
        toast.success("User verified on platform!");
      } else {
        toast.info("User not found on platform (Guest whitelist)");
      }
    } catch (err) {
      console.error("Lookup error:", err);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleDeletePartner = async (phone) => {
    toast.error("Remove Customer?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const updatedPartners = payLaterPartners.filter(p => p.phone !== phone);
            const result = await updateShop({ payLaterPartners: updatedPartners });

            if (result.success) {
              setPayLaterPartners(result.data.payLaterPartners);
              toast.success("Customer removed");
            } else {
              throw new Error(result.error);
            }
          } catch (err) {
            toast.error("Failed to remove customer");
          }
        }
      }
    });
  };

  const getPartnerActivity = (phone) => {
    const cleanTarget = phone.replace(/\D/g, '');
    const partnerOrders = (orders || []).filter(o => {
        const cleanO = (o.phone || '').replace(/\D/g, '');
        return cleanO === cleanTarget || 
               (cleanO.length === 10 && '91' + cleanO === cleanTarget) ||
               (cleanTarget.length === 10 && '91' + cleanTarget === cleanO);
    });
    const totalSpent = partnerOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);
    const lastOrder = partnerOrders.length > 0 ? partnerOrders[0] : null;
    const creditOrders = partnerOrders.filter(o => 
        (o.paymentMethod === 'PAY_LATER' || o.paymentMethod === 'CREDIT' || o.paymentMethod === 'SPLIT') && 
        (o.paymentStatus === 'CREDIT' || o.paymentStatus === 'PARTIAL' || o.paymentStatus === 'PENDING')
    );
    const totalCredit = creditOrders.reduce((sum, o) => sum + (o.balanceDue !== undefined ? o.balanceDue : (o.totalPrice || o.total || 0)), 0);

    return {
      orders: partnerOrders,
      totalSpent,
      lastOrder,
      totalCredit,
      orderCount: partnerOrders.length
    };
  };

  const creditCustomers = React.useMemo(() => {
    const regularMap = new Map();
    (orders || []).forEach(order => {
      const phone = order.phone;
      if (!phone) return;
      
      const isCredit = (order.paymentMethod === 'PAY_LATER' || order.paymentMethod === 'CREDIT' || order.paymentMethod === 'SPLIT') && 
                       (order.paymentStatus === 'CREDIT' || order.paymentStatus === 'PARTIAL' || order.paymentStatus === 'PENDING');
      
      if (!isCredit) return;
      
      if (!regularMap.has(phone)) {
        regularMap.set(phone, {
          name: order.customerName || 'Normal Customer',
          phone: phone,
          isRegular: true,
          addedAt: order.createdAt 
        });
      }
    });

    payLaterPartners.forEach(p => {
      if (!regularMap.has(p.phone)) {
        regularMap.set(p.phone, {
          ...p,
          isRegular: true,
          isWhitelisted: true
        });
      } else {
        regularMap.set(p.phone, {
          ...regularMap.get(p.phone),
          ...p,
          isWhitelisted: true
        });
      }
    });

    return Array.from(regularMap.values());
  }, [orders, payLaterPartners]);

  const filteredItems = creditCustomers.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone || '').includes(searchQuery) ||
    (p.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSettleOrder = async (orderId, amount) => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    
    try {
      const order = (orders || []).find(o => (o._id || o.id) === orderId);
      if (!order) return;

      const result = await updateOrderPayment(orderId, {
        paidAmount: Number(amount),
        paymentStatus: Number(amount) >= (order.totalPrice || order.total_price) ? 'PAID' : 'PARTIAL'
      });

      if (result.success) {
        toast.success("Payment recorded!");
        if (viewingPartner) {
            const activity = getPartnerActivity(viewingPartner.phone);
            setViewingPartner(prevVP => ({
                ...prevVP,
                ...activity
            }));
        }
        setSettlingOrder(null);
        setSettleAmount('');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message || "Failed to settle transaction");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const res = await deleteOrder(orderId);
    if (res.success) {
      toast.success("Transaction deleted and stock restored");
      if (viewingPartner) {
        setViewingPartner(prev => ({
          ...prev,
          orders: prev.orders.filter(o => o.id !== orderId),
          orderCount: prev.orderCount - 1,
        }));
      }
    } else {
      toast.error("Failed to delete transaction");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-brand-primary" size={40} />
    </div>
  );

  return (
    <div className="flex flex-col md:h-screen md:overflow-hidden min-h-screen bg-slate-50/30 p-2 md:p-8 md:rounded-[40px] border border-slate-200/50 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">
              Credit Ledger
          </h1>
          <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-[0.2em]">
              Track and settle outstanding dues from regular customers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full lg:w-auto">
            <div className="relative group w-full sm:w-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-600 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Search Customers..." 
                    className="h-11 bg-white border border-gray-250 focus:border-sky-300 rounded-xl pl-10 pr-4 text-xs font-bold text-gray-900 shadow-sm focus:outline-none transition-all w-full sm:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button 
                onClick={handleDownloadPDF}
                className="h-11 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0"
            >
                <Download size={14} />
                Download PDF
            </button>
            <button 
                onClick={handleOpenAdd}
                className="h-11 px-5 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-sky-700 active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
            >
                <UserPlus size={16} strokeWidth={2.5} />
                Add Customer
            </button>
        </div>
      </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col min-h-0 md:overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/20 shrink-0">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                      <CreditCard size={20} className="text-sky-600" />
                      Outstanding Consumer Balances
                  </h3>
                  <span className="text-[10px] font-black text-sky-600 bg-sky-50 border-sky-100 px-4 py-1.5 rounded-full uppercase tracking-tighter border">
                      {filteredItems.length} ACTIVE DEBTORS
                  </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredItems.length > 0 ? (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Identity</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Details</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Spent</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Management</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredItems.map((p) => {
                            const activity = getPartnerActivity(p.phone);
                            return (
                                <tr key={p.phone} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    (p.name || 'C').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm leading-none mb-1">{p.name || 'Unnamed Customer'}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {p.addedAt ? 'Added ' + new Date(p.addedAt).toLocaleDateString() : 'Active'}
                                                    </p>
                                                    {activity.orderCount > 0 && (
                                                        <span className="w-1 h-1 rounded-full bg-sky-500"></span>
                                                    )}
                                                    {activity.orderCount > 0 && (
                                                        <p className="text-[9px] font-black text-sky-600 uppercase tracking-tighter">{activity.orderCount} Transactions</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-gray-700 font-bold text-xs">
                                                <Phone size={12} className="text-sky-400" />
                                                {p.phone}
                                            </div>
                                            {p.email && (
                                                <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px]">
                                                    <Mail size={12} className="text-sky-300" />
                                                    {p.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-gray-900">₹{activity.totalSpent.toLocaleString()}</span>
                                            {activity.totalCredit > 0 && (
                                                <span className="text-[8px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full uppercase tracking-tighter mt-1">
                                                    ₹{activity.totalCredit} Credit
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setViewingPartner({ ...p, ...activity })}
                                                className="px-4 h-9 bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest border hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                                title="View Activity"
                                            >
                                                <TrendingUp size={12} />
                                                Manage
                                            </button>
                                            <button 
                                                onClick={() => handleOpenEdit(p)}
                                                className="w-10 h-10 text-gray-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-90 flex items-center justify-center"
                                                title="Edit Customer"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeletePartner(p.phone)}
                                                className="w-10 h-10 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90 flex items-center justify-center"
                                                title="Delete Customer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                  </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6">
                        <CreditCard className="text-gray-200" size={48} />
                    </div>
                    <p className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                        No Credit Balances
                    </p>
                    <p className="text-sm text-gray-400 font-bold max-w-xs uppercase tracking-widest">
                        Any registered customer using Pay Later will appear here for settlement.
                    </p>
                </div>
            )}
          </div>
      </div>

      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
                  <div className="p-8 pb-6 bg-gradient-to-br from-sky-500 to-sky-700">
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-5">
                              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl">
                                  <Wallet size={32} className="text-white" />
                              </div>
                              <div>
                                  <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                                      {editingPartner ? 'Edit Account' : 'Credit Account Setup'}
                                  </p>
                                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase">
                                      {editingPartner ? editingPartner.name : 'Pay Later Client'}
                                  </h3>
                                  {isUserVerified && (
                                      <div className="flex items-center gap-1.5 mt-2">
                                          <div className="w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center">
                                              <CheckCircle2 size={10} className="text-white" />
                                          </div>
                                          <p className="text-emerald-300 text-[9px] font-black uppercase tracking-widest">Verified on Platform</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all">
                              <X size={20} strokeWidth={3} />
                          </button>
                      </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-8 space-y-5">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-4">Customer Full Name</label>
                          <input 
                              type="text" required
                              placeholder="Customer Name"
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-300 focus:bg-sky-50/30 rounded-2xl p-4 text-sm font-bold text-gray-800 outline-none transition-all"
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2 relative">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
                              <div className="relative">
                                  <input 
                                      type="tel" required
                                      disabled={!!editingPartner}
                                      placeholder="10-digit number"
                                      className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-300 focus:bg-white rounded-2xl p-4 text-sm font-bold text-gray-800 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      value={formData.phone}
                                      onChange={e => {
                                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                          setFormData({...formData, phone: val});
                                          if (isUserVerified) setIsUserVerified(false);
                                      }}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handlePhoneLookup(formData.phone);
                                          }
                                      }}
                                  />
                                  {isLookingUp && (
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                          <Loader2 size={16} className="animate-spin text-sky-500" />
                                      </div>
                                  )}
                              </div>
                              {!editingPartner && (
                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4">Press Enter to auto-fill</p>
                              )}
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                              <input 
                                  type="email"
                                  placeholder="customer@example.com"
                                  className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-300 focus:bg-white rounded-2xl p-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                           <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-4">Customer Image <span className="text-gray-300">(Optional)</span></label>
                           <div className="relative">
                               <input 
                                   type="file"
                                   id="customer-image"
                                   accept="image/*"
                                   className="hidden"
                                   onChange={e => setImageFile(e.target.files[0])}
                               />
                               <label 
                                   htmlFor="customer-image"
                                   className={`w-full h-[54px] flex items-center justify-between px-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${imageFile || formData.imageUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-sky-300 hover:bg-sky-50'}`}
                               >
                                   <span className="text-xs font-bold truncate pr-2">
                                       {imageFile ? imageFile.name : formData.imageUrl ? 'Change Photo' : 'Upload Photo'}
                                   </span>
                                   <Plus size={16} />
                               </label>
                           </div>
                      </div>

                      <div className="pt-2 flex gap-4">
                          <button
                              type="button"
                              onClick={() => setIsAdding(false)}
                              className="flex-1 h-16 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                          >
                              Cancel
                          </button>
                          <button
                              type="submit"
                              disabled={isSaving}
                              className="flex-[2] h-16 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                              {editingPartner ? 'Update Customer' : 'Add Credit Client'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {viewingPartner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-10 pb-6 border-b bg-slate-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-sky-600 text-white rounded-3xl flex items-center justify-center font-black text-xl shadow-xl shadow-sky-600/20 overflow-hidden">
                              {viewingPartner.imageUrl ? (
                                  <img src={viewingPartner.imageUrl} alt={viewingPartner.name} className="w-full h-full object-cover" />
                              ) : (
                                  (viewingPartner.name || 'C').charAt(0).toUpperCase()
                              )}
                          </div>
                          <div>
                              <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">{viewingPartner.name}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                      <Phone size={14} className="text-sky-600" />
                                      {viewingPartner.phone}
                                  </div>
                                  <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                  <div className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full border border-sky-100 text-sky-600">
                                      Registered Customer
                                  </div>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setViewingPartner(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-gray-100 shadow-sm">
                          <X size={24} strokeWidth={3} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                          <div className="bg-white border-2 border-slate-100 rounded-[32px] p-6 shadow-sm group hover:border-sky-600/20 transition-all">
                              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4">
                                  <ShoppingBag size={24} />
                              </div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
                              <h4 className="text-3xl font-black text-gray-900 leading-none">{viewingPartner.orderCount}</h4>
                          </div>

                          <div className="bg-white border-2 border-slate-100 rounded-[32px] p-6 shadow-sm group hover:border-emerald-600/20 transition-all">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                                  <IndianRupee size={24} />
                              </div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Spent</p>
                              <h4 className="text-3xl font-black text-gray-900 leading-none">₹{viewingPartner.totalSpent.toLocaleString()}</h4>
                          </div>

                          <div className="bg-white border-2 border-slate-100 rounded-[32px] p-6 shadow-sm group hover:border-sky-600/20 transition-all">
                              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4">
                                  <CreditCard size={24} />
                              </div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Outstanding Dues</p>
                              <h4 className="text-3xl font-black text-gray-900 leading-none">₹{viewingPartner.totalCredit.toLocaleString()}</h4>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                              <Clock size={18} className="text-sky-600" />
                              Recent Transactions
                          </h4>

                          {viewingPartner.orders.length > 0 ? (
                              <div className="space-y-4">
                                  {viewingPartner.orders.slice(0, 5).map(order => (
                                      <div key={order.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-sky-100 transition-all">
                                          <div className="flex items-center gap-4">
                                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(order.paymentMethod === 'PAY_LATER' || order.paymentMethod === 'CREDIT') ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                  {(order.paymentMethod === 'PAY_LATER' || order.paymentMethod === 'CREDIT') ? <CreditCard size={20} /> : <ShoppingBag size={20} />}
                                              </div>
                                              <div>
                                                  <p className="text-xs font-black text-gray-900 leading-none mb-1">Order #{order.id.slice(-6).toUpperCase()}</p>
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                      <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                      <span className={`text-[9px] font-black uppercase tracking-tighter ${order.status === 'COMPLETED' ? 'text-emerald-600' : 'text-sky-600'}`}>{order.status}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right flex items-center gap-4">
                                              <div className="flex flex-col items-end">
                                                  <p className="text-sm font-black text-gray-900 leading-none mb-1">₹{(order.totalPrice || order.total || 0).toLocaleString()}</p>
                                                  <div className="flex items-center gap-2">
                                                      {order.paymentStatus === 'PAID' && (
                                                          <span className="text-[7px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">Paid</span>
                                                      )}
                                                      {(order.paymentStatus === 'PENDING' || order.paymentStatus === 'CREDIT') && (
                                                          <span className="text-[7px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-rose-100">Credit Due</span>
                                                      )}
                                                      <p className={`text-[8px] font-black uppercase tracking-widest ${(order.paymentMethod === 'PAY_LATER' || order.paymentMethod === 'CREDIT') && order.paymentStatus !== 'PAID' ? 'text-sky-500' : 'text-gray-400'}`}>
                                                          {(order.paymentMethod === 'PAY_LATER' || order.paymentMethod === 'CREDIT') && (order.paymentStatus === 'CREDIT' || order.paymentStatus === 'PENDING') ? 'CREDIT' : 
                                                           order.paymentStatus === 'PARTIAL' ? `BAL: ₹${(order.balanceDue || 0).toLocaleString()}` :
                                                           order.paymentMethod}
                                                      </p>
                                                  </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                  {(order.paymentMethod === 'PAY_LATER' || order.paymentMethod === 'CREDIT') && order.paymentStatus !== 'PAID' && (
                                                      <div className="flex flex-col gap-2">
                                                          {settlingOrder === order.id ? (
                                                              <div className="flex items-center gap-2">
                                                                  <input 
                                                                      type="number" min="0"
                                                                      placeholder="Amount"
                                                                      className="w-20 h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-emerald-500 outline-none"
                                                                      value={settleAmount}
                                                                      onChange={e => setSettleAmount(e.target.value)}
                                                                      autoFocus
                                                                  />
                                                                  <button 
                                                                      onClick={(e) => { e.stopPropagation(); handleSettleOrder(order.id, settleAmount); }}
                                                                      className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                                                                  >
                                                                      <Check size={16} strokeWidth={3} />
                                                                  </button>
                                                                  <button 
                                                                      onClick={(e) => { e.stopPropagation(); setSettlingOrder(null); }}
                                                                      className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200"
                                                                  >
                                                                      <X size={16} strokeWidth={3} />
                                                                  </button>
                                                              </div>
                                                          ) : (
                                                              <button 
                                                                  onClick={(e) => { e.stopPropagation(); setSettlingOrder(order.id); setSettleAmount(order.balanceDue || order.totalPrice); }}
                                                                  className="h-10 px-4 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                                                              >
                                                                  <CheckCircle size={14} />
                                                                  Mark Paid
                                                              </button>
                                                          )}
                                                      </div>
                                                  )}

                                                  <button 
                                                      onClick={async (e) => { 
                                                          e.stopPropagation(); 
                                                          toast.error("Confirm Delete?", {
                                                              action: {
                                                                  label: "Delete",
                                                                  onClick: () => handleDeleteOrder(order.id)
                                                              }
                                                          });
                                                      }}
                                                      className="w-10 h-10 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                  >
                                                      <Trash2 size={16} />
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-xs italic">No transactions recorded</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CreditCustomers;
