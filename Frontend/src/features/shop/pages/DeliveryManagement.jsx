import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { UserPlus, Shield, Smartphone, Key, Trash2, UserCheck, Lock, Loader2, User, XCircle, Check, Eye, EyeOff, Save, Truck, Package, Clock, Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SafeDeleteModal from '../../common/components/SafeDeleteModal';

const DeliveryManagement = () => {
  const { getDeliveryPartners, updateDeliveryPartner, deleteDeliveryPartner, vendorShop, updateShop } = useStore();
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);
  const [viewingDocs, setViewingDocs] = useState(null);
  const [isSafeDeleteOpen, setIsSafeDeleteOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  
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

  useEffect(() => {
    if (vendorShop) {
      setShopConfig({
        deliveryAccessCode: vendorShop.deliveryAccessCode || '',
        storeCode: vendorShop.storeCode || ''
      });
    }
  }, [vendorShop]);

  const fetchPartners = React.useCallback(async () => {
    setLoading(true);
    const data = await getDeliveryPartners();
    setPartners(data || []);
    setLoading(false);
  }, [getDeliveryPartners]);

  useEffect(() => {
    fetchPartners();
  }, [vendorShop?._id, user?.role, fetchPartners]);

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


  const toggleStatus = async (partner, newStatus) => {
    setActionLoading(true);
    try {
      await updateDeliveryPartner(partner._id, { status: newStatus });
      toast.success(`Partner status updated to ${newStatus}`);
      fetchPartners();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (partner) => {
    setPartnerToDelete(partner);
    setIsSafeDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!partnerToDelete) return;
    setActionLoading(true);
    try {
      await deleteDeliveryPartner(partnerToDelete._id);
      toast.success('Partner deleted successfully');
      fetchPartners();
    } catch {
      toast.error('Failed to delete partner');
    } finally {
      setActionLoading(false);
      setIsSafeDeleteOpen(false);
      setPartnerToDelete(null);
    }
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

  const fetchPartnerReport = React.useCallback(async () => {
    if (!selectedPartnerForReport) return;
    setIsFetchingReport(true);
    try {
      const { data } = await api.get('/orders', {
        params: {
          deliveryPartnerId: selectedPartnerForReport._id,
          startDate: reportDateRange.startDate,
          endDate: new Date(new Date(reportDateRange.endDate).getTime() + 86400000).toISOString().split('T')[0],
          status: 'COMPLETED'
        }
      });
      setReportOrders(data.orders || []);
    } catch (err) {
      toast.error("Failed to fetch report data");
    } finally {
      setIsFetchingReport(false);
    }
  }, [selectedPartnerForReport, reportDateRange]);

  useEffect(() => {
    if (selectedPartnerForReport) {
      fetchPartnerReport();
    }
  }, [selectedPartnerForReport, fetchPartnerReport]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-sky-600" size={40} />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 p-2 lg:p-6 font-sans">
      {/* Header */}
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 md:pb-10 border-b border-gray-100/50 flex-shrink-0">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        {/* Config Column - Only show for Vendors/Staff */}
        {(user?.role === 'vendor' || user?.role === 'staff') && (
          <div className="w-full lg:w-80 space-y-6 md:overflow-y-auto custom-scrollbar pb-4 lg:pb-0">
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
        )}

        {/* List Column */}
        <div className={`flex-1 flex flex-col min-h-0 md:overflow-hidden ${(user?.role === 'vendor' || user?.role === 'staff') ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="space-y-4 flex-1 overflow-y-auto pr-4 custom-scrollbar">
            {partners.length === 0 && (
               <div className="bg-white rounded-[40px] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                     <Truck size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">No Active Fleet</h3>
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
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-black text-gray-900 uppercase tracking-wide text-lg leading-tight group-hover:text-sky-600 transition-colors">{partner.name}</h4>
                    <span className="px-2 py-0.5 bg-gray-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">Token: #{partner._id.slice(-6).toUpperCase()}</span>
                  </div>
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
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-50/50 p-1.5 rounded-[22px] border border-gray-100">
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
                  {partner.status === 'pending' && user?.role === 'admin' && (
                    <>
                      <button 
                        disabled={actionLoading}
                        onClick={() => toggleStatus(partner, 'active')}
                        className="px-4 py-3 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Approve
                      </button>
                      <button 
                        disabled={actionLoading}
                        onClick={() => toggleStatus(partner, 'rejected')}
                        className="px-4 py-3 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                      </button>
                    </>
                  )}
                  {partner.status !== 'pending' && user?.role === 'admin' && (
                    <button 
                      disabled={actionLoading}
                      onClick={() => toggleStatus(partner, partner.status === 'active' ? 'suspended' : 'active')}
                      className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                        partner.status === 'active' ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                      } disabled:opacity-50`}
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : (partner.status === 'active' ? <Lock size={14} /> : <UserCheck size={14} />)}
                      {partner.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </div>
                
                <button 
                  disabled={actionLoading}
                  onClick={() => handleDelete(partner)}
                  className="w-12 h-12 rounded-[20px] flex items-center justify-center text-gray-200 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                </button>
              </div>
            </div>
            ))}
          </div>
        </div>
      </div>

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
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-400 text-center uppercase tracking-[0.3em]">ID Proof</h3>
                  <div className="aspect-[3/4] bg-gray-100 rounded-[32px] overflow-hidden border-4 border-white shadow-xl relative group">
                     <img src={viewingDocs.documentUrl} alt="ID" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <a href={viewingDocs.documentUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"><Download size={14}/> Download ID</a>
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-emerald-500 text-center uppercase tracking-[0.3em]">Live Selfie</h3>
                  <div className="aspect-[3/4] bg-gray-100 rounded-[32px] overflow-hidden border-4 border-white shadow-xl relative group">
                     {viewingDocs.selfieUrl ? (
                       <>
                         <img src={viewingDocs.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <a href={viewingDocs.selfieUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"><Download size={14}/> Download Selfie</a>
                         </div>
                       </>
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-[10px] uppercase">No Selfie</div>
                     )}
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
                       <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100 shadow-sm relative overflow-hidden group">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Total Gross Earnings</p>
                           <p className="text-4xl font-black text-slate-900 tracking-tighter">
                             ₹{(reportOrders.reduce((sum, o) => sum + (o.deliveryFee || 0) + (o.extraAmount || 0), 0)).toLocaleString()}
                           </p>
                           <div className="mt-4 pt-4 border-t border-emerald-100/50">
                              <p className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1.5">
                                 <CheckCircle size={10}/> Before Payout Deductions
                              </p>
                           </div>
                        </div>
                    </div>

                    {/* Settlement Details */}
                    <div className="p-6 bg-slate-900 rounded-[32px] text-white">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-sky-400">
                              <Shield size={24}/>
                           </div>
                           <div>
                              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Bank Settlement Account</h4>
                              <p className="text-lg font-black uppercase tracking-tight">{selectedPartnerForReport.bankName || 'NOT PROVIDED'}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 opacity-80">
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-sky-400 uppercase">Account Holder</p>
                              <p className="text-xs font-bold uppercase">{selectedPartnerForReport.accountName || '--'}</p>
                           </div>
                           <div className="space-y-1 text-right">
                              <p className="text-[8px] font-black text-sky-400 uppercase">Account Number</p>
                              <p className="text-xs font-bold tracking-widest">{selectedPartnerForReport.accountNumber || '--'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-sky-400 uppercase">IFSC CODE</p>
                              <p className="text-xs font-bold tracking-widest uppercase">{selectedPartnerForReport.ifscCode || '--'}</p>
                           </div>
                           <div className="space-y-1 text-right">
                              <p className="text-[8px] font-black text-sky-400 uppercase">Status</p>
                              <p className="text-[9px] font-black text-emerald-400 uppercase">Verified for Transfer</p>
                           </div>
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
      {/* Safe Delete Confirmation Modal */}
      {partnerToDelete && (
        <SafeDeleteModal 
          isOpen={isSafeDeleteOpen}
          onClose={() => { setIsSafeDeleteOpen(false); setPartnerToDelete(null); }}
          onConfirm={confirmDelete}
          targetName={partnerToDelete.name}
          targetType="delivery partner"
        />
      )}
    </div>
  );
};

export default DeliveryManagement;
