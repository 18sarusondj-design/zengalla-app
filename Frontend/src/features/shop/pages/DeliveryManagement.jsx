import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { UserPlus, Shield, Smartphone, Key, Trash2, UserCheck, Lock, Loader2, User, XCircle, Check, Eye, EyeOff, Save, Truck, Package, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DeliveryManagement = () => {
  const { getDeliveryPartners, createDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner, vendorShop, updateShop } = useStore();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [viewingDocs, setViewingDocs] = useState(null);
  
  const [shopConfig, setShopConfig] = useState({
    deliveryAccessCode: '',
    storeCode: ''
  });

  // Report States
  const [selectedPartnerForReport, setSelectedPartnerForReport] = useState(null);
  const [reportDateRange, setReportDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportOrders, setReportOrders] = useState([]);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [globalDateRange, setGlobalDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    phone: '',
    photoUrl: '',
    documentUrl: ''
  });

  useEffect(() => {
    if (vendorShop) {
      setShopConfig({
        deliveryAccessCode: vendorShop.deliveryAccessCode || '',
        storeCode: vendorShop.storeCode || ''
      });
    }
  }, [vendorShop]);

  useEffect(() => {
    if (vendorShop?._id) {
      fetchPartners();
    }
  }, [vendorShop?._id]);

  const fetchPartners = async () => {
    setLoading(true);
    const data = await getDeliveryPartners();
    setPartners(data || []);
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      // 1. Fetch Fleet Performance Data for the selected range
      const { data } = await api.get('/orders', {
        params: {
          startDate: globalDateRange.startDate,
          endDate: new Date(new Date(globalDateRange.endDate).getTime() + 86400000).toISOString().split('T')[0],
          status: 'COMPLETED'
        }
      });
      
      const orders = data.orders || [];
      const totalEarnings = orders.reduce((sum, o) => sum + (o.deliveryFee || 0) + (o.extraAmount || 0), 0);
      
      // 2. Generate PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(14, 165, 233); // Sky blue
      doc.text('FLEET PERFORMANCE REPORT', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Shop: ${vendorShop?.name || 'My Store'}`, 14, 32);
      doc.text(`Date Range: ${globalDateRange.startDate} to ${globalDateRange.endDate}`, 14, 38);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44);

      // Summary Cards
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(14, 52, 60, 25, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(14, 165, 233);
      doc.text('TOTAL COMPLETED', 20, 60);
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(`${orders.length} Orders`, 20, 70);

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(80, 52, 60, 25, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(22, 163, 74);
      doc.text('TOTAL EARNINGS', 86, 60);
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(`₹${totalEarnings.toLocaleString()}`, 86, 70);

      // Partner Breakdown Table
      const partnerStats = partners.map(p => {
        const pOrders = orders.filter(o => o.deliveryPartnerId?._id === p._id || o.deliveryPartnerId === p._id);
        const pEarnings = pOrders.reduce((sum, o) => sum + (o.deliveryFee || 0) + (o.extraAmount || 0), 0);
        return [
          p.name,
          p.phone,
          pOrders.length.toString(),
          `₹${pEarnings.toLocaleString()}`,
          p.status.toUpperCase()
        ];
      });

      const tableColumn = ["Driver Name", "Phone", "Orders", "Earnings", "Status"];
      
      autoTable(doc, {
        head: [tableColumn],
        body: partnerStats,
        startY: 85,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 85 }
      });

      doc.save(`fleet_performance_${globalDateRange.startDate}_to_${globalDateRange.endDate}.pdf`);
      toast.success('Fleet performance report downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 0. Validation
      if (!formData.name.trim()) throw new Error('Driver name is required');
      if (!formData.phone || formData.phone.length !== 10) throw new Error('Mobile number must be exactly 10 digits');
      if (!editingPartner && (!formData.password || formData.password.length < 4)) throw new Error('Password must be at least 4 characters');
      if (!editingPartner && (!photoFile || !docFile)) throw new Error('Both Recent Photo and ID Document are mandatory for new drivers');

      let photoUrl = formData.photoUrl;
      let documentUrl = formData.documentUrl;

      // 1 & 2. Upload Files in Parallel
      const uploadPromises = [];
      
      if (photoFile) {
        const pData = new FormData();
        pData.append('image', photoFile);
        uploadPromises.push(
          api.post('/upload/image', pData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(res => photoUrl = res.data.url)
        );
      }

      if (docFile) {
        const dData = new FormData();
        dData.append('image', docFile);
        uploadPromises.push(
          api.post('/upload/image', dData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(res => documentUrl = res.data.url)
        );
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      // 3. Save Driver
      const payload = {
        name: formData.name,
        email: formData.phone + '@zengalla.logistics',
        password: formData.password || undefined,
        phone: formData.phone,
        photoUrl,
        documentUrl
      };

      let res;
      if (editingPartner) {
        res = await updateDeliveryPartner(editingPartner._id, {
          name: payload.name,
          phone: payload.phone,
          password: payload.password,
          photoUrl: payload.photoUrl,
          documentUrl: payload.documentUrl,
          status: editingPartner.status
        });
      } else {
        res = await createDeliveryPartner(payload);
      }

      if (res.success) {
        toast.success(editingPartner ? 'Driver profile updated' : 'Driver successfully recruited');
        setIsModalOpen(false);
        setEditingPartner(null);
        setFormData({ name: '', password: '', phone: '', photoUrl: '', documentUrl: '' });
        setPhotoFile(null);
        setDocFile(null);
        fetchPartners(); // Refresh list
      } else {
        throw new Error(res.error || 'Failed to save driver details');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Verification failed';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (partner) => {
    const newStatus = partner.status === 'active' ? 'suspended' : 'active';
    const res = await updateDeliveryPartner(partner._id, { status: newStatus });
    if (res.success) {
      setPartners(prev => prev.map(p => p._id === partner._id ? { ...p, status: newStatus } : p));
    }
  };

  const handleDelete = (id) => {
    toast.error(`Remove delivery boy?`, {
      action: {
        label: "Delete",
        onClick: async () => {
           const res = await deleteDeliveryPartner(id);
           if (res.success) setPartners(prev => prev.filter(p => p._id !== id));
        }
      }
    });
  };

  const handleShopConfigSave = async () => {
    setIsUpdatingShop(true);
    const res = await updateShop({
      deliveryAccessCode: shopConfig.deliveryAccessCode,
      storeCode: shopConfig.storeCode
    });
    if (res.success) {
      toast.success('Shop configuration synchronized');
    }
    setIsUpdatingShop(false);
  };

  const fetchPartnerReport = async () => {
    if (!selectedPartnerForReport) return;
    setIsFetchingReport(true);
    try {
      const { data } = await api.get('/orders', {
        params: {
          deliveryPartnerId: selectedPartnerForReport._id,
          startDate: reportDateRange.startDate,
          endDate: new Date(new Date(reportDateRange.endDate).getTime() + 86400000).toISOString().split('T')[0], // Include end date fully
          status: 'COMPLETED'
        }
      });
      setReportOrders(data.orders || []);
    } catch (err) {
      toast.error("Failed to fetch report data");
    } finally {
      setIsFetchingReport(false);
    }
  };

  useEffect(() => {
    if (selectedPartnerForReport) {
      fetchPartnerReport();
    }
  }, [selectedPartnerForReport, reportDateRange]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-sky-600" size={40} />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white md:p-8 p-4 rounded-[48px] border border-gray-100 shadow-sm relative overflow-hidden font-sans">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 border-b border-gray-100/50">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase leading-none">Delivery Fleet</h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Logistics & Distribution Hub</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
             {/* Date Pickers for PDF */}
             <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 px-3">
                   <Clock size={12} className="text-gray-400" />
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Report Range</span>
                </div>
                <input 
                  type="date" 
                  className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:border-sky-300"
                  value={globalDateRange.startDate}
                  onChange={e => setGlobalDateRange({...globalDateRange, startDate: e.target.value})}
                />
                <span className="text-gray-300 font-bold">-</span>
                <input 
                  type="date" 
                  className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:border-sky-300"
                  value={globalDateRange.endDate}
                  onChange={e => setGlobalDateRange({...globalDateRange, endDate: e.target.value})}
                />
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0a0f1d] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50"
                >
                  {isDownloadingPdf ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                  Download PDF
                </button>
             </div>

             <button
               onClick={() => {
                 setEditingPartner(null);
                 setFormData({ name: '', password: '', phone: '', photoUrl: '', documentUrl: '' });
                 setPhotoFile(null);
                 setDocFile(null);
                 setIsModalOpen(true);
               }}
               className="flex items-center gap-2 px-6 py-3.5 bg-sky-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
             >
               <UserPlus size={16} />
               Onboard Driver
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
        {/* Config Column */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-gradient-to-br from-sky-50/80 to-white rounded-[32px] p-8 border border-sky-100/50 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-100/20 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
              
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-sky-600 mb-6 shadow-md border border-sky-50 relative z-10">
                 <Truck size={28} strokeWidth={2.5} />
              </div>
              
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg mb-4 relative z-10">Fleet Security</h3>
              
               <div className="space-y-4 relative z-10">
                 <div className="space-y-1.5 mb-2">
                    <label className="text-[9px] font-black text-sky-600 uppercase tracking-widest ml-2">Public Store Code (For Login)</label>
                    <div className="relative">
                       <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={14} />
                       <input 
                         type="text" 
                         placeholder="Ex: MYSHOP123"
                         className="w-full bg-white border border-sky-100 rounded-xl py-2.5 pl-10 pr-4 font-black text-xs tracking-widest outline-none focus:border-sky-300 transition-all uppercase"
                         value={shopConfig.storeCode}
                         onChange={e => setShopConfig({ ...shopConfig, storeCode: e.target.value.toUpperCase() })}
                       />
                    </div>
                 </div>

                 <div className="p-4 bg-white/60 rounded-2xl border border-white space-y-2">
                    <p className="text-[10px] text-gray-900 font-black uppercase tracking-wide flex items-center gap-2">
                        <Clock size={12} className="text-sky-500" /> Auto-Assignment
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold leading-relaxed uppercase">Delivery boys can self-assign orders marked as 'READY' from their dashboard.</p>
                 </div>

                 <button 
                   onClick={handleShopConfigSave}
                   disabled={isUpdatingShop}
                   className="w-full mt-2 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-sky-100 hover:bg-sky-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isUpdatingShop ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                    Update Security
                 </button>
              </div>
           </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="space-y-4 flex-1 overflow-y-auto pr-4 custom-scrollbar">
            {partners.length === 0 && (
               <div className="bg-white rounded-[40px] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                     <Truck size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">No Active Fleet</h3>
                  <p className="text-xs text-gray-400 font-medium max-w-[200px]">Recruit your first delivery partner using the button above.</p>
               </div>
            )}
            
            {partners.map((partner) => (
            <div key={partner._id} className="group bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:border-sky-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center text-xl font-black transition-transform group-hover:rotate-3 shadow-md border-4 border-white overflow-hidden ${
                    partner.status === 'active' ? 'bg-sky-50 text-sky-500' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {partner.photoUrl ? (
                      <img src={partner.photoUrl} alt={partner.name} className="w-full h-full object-cover" />
                    ) : (
                      partner.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-xl border-4 border-white shadow-sm flex items-center justify-center ${
                    partner.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {partner.status === 'active' ? <UserCheck size={10} className="text-white" /> : <Lock size={10} className="text-white" />}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-black text-gray-900 uppercase tracking-wide text-lg leading-tight mb-2 group-hover:text-sky-600 transition-colors">{partner.name}</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 rounded-xl border border-gray-100">
                      <Smartphone size={10} className="text-gray-400" />
                      <span className="text-[10px] font-black text-gray-600">{partner.phone}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full flex items-center gap-2 border shadow-sm ${
                      partner.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${partner.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                       <span className="text-[9px] font-black uppercase tracking-widest">{partner.status}</span>
                    </div>
                    {partner.isOnline && (
                      <div className="px-3 py-1 bg-sky-50 border border-sky-100 text-sky-600 rounded-full flex items-center gap-2 shadow-sm">
                         <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Online</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-50/50 p-1.5 rounded-[22px] border border-gray-100">
                  <button 
                    onClick={() => {
                        setEditingPartner(partner);
                        setFormData({ 
                          name: partner.name, 
                          phone: partner.phone, 
                          password: '',
                          photoUrl: partner.photoUrl || '',
                          documentUrl: partner.documentUrl || ''
                        });
                        setPhotoFile(null);
                        setDocFile(null);
                        setIsModalOpen(true);
                    }}
                    className="p-3 bg-white rounded-2xl text-gray-400 hover:text-sky-600 transition-all hover:shadow-md border border-transparent hover:border-sky-100 flex items-center gap-2"
                  >
                    <Eye size={16} />
                    <span className="text-[9px] font-black uppercase hidden md:inline ml-1">Manage</span>
                  </button>
                  <button 
                    onClick={() => setSelectedPartnerForReport(partner)}
                    className="p-3 bg-white rounded-2xl text-gray-400 hover:text-sky-600 transition-all hover:shadow-md border border-transparent hover:border-sky-100 flex items-center gap-2"
                  >
                    <Package size={16} />
                    <span className="text-[9px] font-black uppercase hidden md:inline ml-1">Report</span>
                  </button>
                  <button 
                    onClick={() => setViewingDocs(partner)}
                    className="p-3 bg-white rounded-2xl text-gray-400 hover:text-emerald-600 transition-all hover:shadow-md border border-transparent hover:border-emerald-100 flex items-center gap-2"
                  >
                    <Shield size={16} />
                    <span className="text-[9px] font-black uppercase hidden md:inline ml-1">Docs</span>
                  </button>
                  <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                  <button 
                    onClick={() => toggleStatus(partner)}
                    className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                      partner.status === 'active' ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'
                    }`}
                  >
                    {partner.status === 'active' ? <Lock size={14} /> : <UserCheck size={14} />}
                    {partner.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
                
                <button 
                  onClick={() => handleDelete(partner._id)}
                  className="w-12 h-12 rounded-[20px] flex items-center justify-center text-gray-200 hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <div>
                 <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{editingPartner ? 'Modify Driver' : 'New Driver'}</h2>
                 <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest mt-0.5">Delivery Boy Credentials</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><XCircle size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-5">Driver Name</label>
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                    <input required placeholder="John Doe" className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-5 pl-14 pr-6 font-bold text-sm focus:border-sky-100 focus:bg-white transition-all outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-5">Mobile Number</label>
                  <div className="relative group">
                    <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                    <input required maxLength="10" placeholder="Driver's Phone" className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-5 pl-14 pr-6 font-bold text-sm focus:border-sky-100 focus:bg-white transition-all outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-5">Access Password</label>
                  <div className="relative group">
                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                    <input 
                       required={!editingPartner}
                       type={showPassword ? "text" : "password"} 
                       placeholder={editingPartner ? "••••••••" : "Driver Password"} 
                       className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-5 pl-14 pr-14 font-bold text-sm focus:border-sky-100 focus:bg-white transition-all outline-none" 
                       value={formData.password} 
                       onChange={e => setFormData({...formData, password: e.target.value})} 
                    />
                    <button 
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-sky-600"
                    >
                       {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-5">Recent Photo <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="file" id="photo-upload" accept="image/*" className="hidden"
                        onChange={e => setPhotoFile(e.target.files[0])}
                      />
                      <label htmlFor="photo-upload" className={`w-full h-14 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${photoFile || formData.photoUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-sky-300'}`}>
                        <span className="text-[10px] font-bold truncate px-4">{photoFile ? photoFile.name : formData.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-5">ID Document <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="file" id="doc-upload" accept="image/*" className="hidden"
                        onChange={e => setDocFile(e.target.files[0])}
                      />
                      <label htmlFor="doc-upload" className={`w-full h-14 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${docFile || formData.documentUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-sky-300'}`}>
                        <span className="text-[10px] font-bold truncate px-4">{docFile ? docFile.name : formData.documentUrl ? 'Change ID' : 'PAN/Aadhaar'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-18 py-5 bg-sky-600 text-white rounded-[28px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-sky-100 hover:bg-sky-700 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (editingPartner ? <Check size={20} /> : <UserPlus size={20} />)}
                {editingPartner ? 'Save Changes' : 'Register Driver'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Docs Viewer Modal */}
      {viewingDocs && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-6" onClick={() => setViewingDocs(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black">
                     {viewingDocs.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{viewingDocs.name}</h2>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Verified Credentials</p>
                  </div>
               </div>
               <button onClick={() => setViewingDocs(null)} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all"><XCircle size={20}/></button>
            </div>
            <div className="p-10 grid grid-cols-2 gap-10">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Recent Photo</p>
                  <div className="aspect-square rounded-[32px] overflow-hidden border-8 border-gray-50 shadow-inner">
                     <img src={viewingDocs.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">ID Proof (PAN/Aadhaar)</p>
                  <div className="aspect-[3/4] rounded-[32px] overflow-hidden border-8 border-gray-50 shadow-inner">
                     <img src={viewingDocs.documentUrl} alt="ID" className="w-full h-full object-cover" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
      {/* Performance Report Modal */}
      {selectedPartnerForReport && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[700] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Performance Report</h2>
                  <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest mt-0.5">{selectedPartnerForReport.name}</p>
               </div>
               <button onClick={() => setSelectedPartnerForReport(null)} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all"><XCircle size={20}/></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto">
               {/* Date Filter */}
               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Start Date</label>
                     <input 
                       type="date" 
                       className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-sky-300 transition-all"
                       value={reportDateRange.startDate}
                       onChange={e => setReportDateRange({...reportDateRange, startDate: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">End Date</label>
                     <input 
                       type="date" 
                       className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-sky-300 transition-all"
                       value={reportDateRange.endDate}
                       onChange={e => setReportDateRange({...reportDateRange, endDate: e.target.value})}
                     />
                  </div>
               </div>

               {isFetchingReport ? (
                 <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-sky-500" size={32} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculating Earnings...</p>
                 </div>
               ) : (
                 <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-sky-50 rounded-[32px] p-8 border border-sky-100 shadow-sm">
                          <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-2">Total Orders</p>
                          <p className="text-4xl font-black text-slate-900 tracking-tighter">{reportOrders.length}</p>
                       </div>
                       <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100 shadow-sm">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Total Earned</p>
                          <p className="text-4xl font-black text-slate-900 tracking-tighter">
                            ₹{reportOrders.reduce((sum, o) => sum + (o.deliveryFee || 0) + (o.extraAmount || 0), 0).toLocaleString()}
                          </p>
                       </div>
                    </div>

                    {/* Order List */}
                    <div className="space-y-4">
                       <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <Clock size={14} className="text-sky-500" /> Recent Deliveries
                       </h3>
                       {reportOrders.length === 0 ? (
                         <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No completed orders in this range</p>
                         </div>
                       ) : (
                         <div className="space-y-3">
                            {reportOrders.map(order => (
                              <div key={order._id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                       <Package size={18} />
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-black text-gray-900 uppercase">#{order._id.slice(-6)}</p>
                                       <p className="text-[8px] font-bold text-gray-400 uppercase">{new Date(order.createdAt).toLocaleString()}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600">₹{(order.deliveryFee || 0) + (order.extraAmount || 0)}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Earned</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
            
            <div className="p-8 border-t border-gray-50 bg-gray-50/30">
               <button 
                 onClick={() => setSelectedPartnerForReport(null)}
                 className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
               >
                 Close Report
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
