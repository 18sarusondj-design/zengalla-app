import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { Users as UsersIcon, Search, Trash2, Download, ShieldCheck, ShieldAlert, Sparkles, Clock, Calendar, RefreshCcw, Phone, MessageSquare, Map, Globe, Zap, Award, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import Pagination from '../../common/components/Pagination';
import api from '../../../config/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SafeDeleteModal from '../../common/components/SafeDeleteModal';

const Users = ({ roleFilter }) => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPinFilter, setSelectedPinFilter] = useState('all');
  const [pinDropdownOpen, setPinDropdownOpen] = useState(false);
  const [pinSearch, setPinSearch] = useState('');
  const [pinAreaMap, setPinAreaMap] = useState({}); // { '580025': 'Hubballi' }
  const [modalData, setModalData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isSafeDeleteOpen, setIsSafeDeleteOpen] = useState(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (selectedVendor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedVendor]);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`);
      if (data.users) {
        setUsers(data.users);
        // Pre-populate pinAreaMap with areaNames from the database
        const initialMap = {};
        data.users.forEach(u => {
          if (u.pinCode && u.areaName) {
            if (!initialMap[u.pinCode] || initialMap[u.pinCode].length < u.areaName.length) {
              initialMap[u.pinCode] = u.areaName;
            }
          }
        });
        setPinAreaMap(prev => ({ ...prev, ...initialMap }));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      
      // Select data based on current view
      let dataToExport = [...users];
      let title = roleFilter === 'vendor' ? 'AUTHORIZED VENDOR REGISTRY' : 'CUSTOMER DATABASE REPORT';
      
      if (showExpiringSoon) {
        dataToExport = users.filter(u => u.role === 'vendor' && u.daysRemaining !== null && u.daysRemaining <= 5);
        title = 'CRITICAL EXPIRY REPORT (5 DAYS)';
      } else if (selectedPinFilter !== 'all') {
        dataToExport = users.filter(u => u.pinCode === selectedPinFilter);
        title = `VENDOR REGISTRY - PIN ${selectedPinFilter}`;
      }
      
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text(title, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, 14, 30);
      doc.text(`Records: ${dataToExport.length}`, 14, 35);
      if (selectedPinFilter !== 'all') {
        doc.text(`Filter Area: ${selectedPinFilter}`, 14, 40);
      }

      const tableColumn = roleFilter === 'vendor' 
        ? ["Shop Name", "Owner", "Phone", "Access Date", "Days Left", "Plan"]
        : ["Name", "Phone", "Email", "Role", "Join Date"];
        
      const tableRows = dataToExport.map(u => [
        roleFilter === 'vendor' ? (u.shopName || 'NO SHOP') : (u.name || 'N/A'),
        roleFilter === 'vendor' ? (u.name || 'N/A') : (u.phone || 'N/A'),
        roleFilter === 'vendor' ? (u.phone || 'N/A') : (u.email || 'N/A'),
        roleFilter === 'vendor' ? (u.planStartedAt ? new Date(u.planStartedAt).toLocaleDateString() : 'N/A') : u.role,
        roleFilter === 'vendor' ? (u.daysRemaining !== null ? `${u.daysRemaining} Days` : 'N/A') : (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'),
        roleFilter === 'vendor' ? (u.subscriptionPlan?.toUpperCase() || 'NONE') : '-'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: (showExpiringSoon || selectedPinFilter !== 'all') ? 50 : 45,
        theme: 'grid',
        headStyles: { 
          fillColor: [14, 165, 233],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { top: 45 }
      });

      doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(showExpiringSoon ? 'Critical Expiry Registry Saved' : 'Registry Downloaded Successfully');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Failed to generate PDF report');
    }
  };

    const handleDelete = async (id) => {
      if (!id) return toast.error("Cannot delete: Missing User ID");
      try {
        const { data } = await api.delete(`/admin/users/${id}`);
        if (data.success) {
          setUsers(prev => prev.filter(u => (u._id || u.id) !== id));
          setSelectedVendor(null); // Close modal on delete
          toast.success('Account deleted permanently from database');
        }
      } catch (err) {
        toast.error(err.message || 'Identity delete failed');
      }
    };

    const handleStatusToggle = async (userId) => {
      setIsProcessing(userId);
      try {
        const userToToggle = users.find(u => (u._id || u.id) === userId);
        const newStatus = userToToggle.status === 'active' ? 'suspended' : 'active';

        const { data } = await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
        
        if (data.success) {
          toast.success(`Account ${newStatus === 'active' ? 'Activated' : 'Suspended'}`);
          fetchUsers();
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsProcessing(null);
      }
    };

    const handleUpdateSubscription = async (id, type) => {
      setIsProcessing(id);
      try {
        const { data } = await api.patch(`/admin/users/${id}/role`, { role: 'vendor' }); // Placeholder logic for sub update
        if (data.success) {
           toast.success(`${type.toUpperCase()} plan activated!`);
           fetchUsers();
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsProcessing(null);
      }
    };

  const handleManualWhatsApp = async (u) => {
    setIsProcessing(u.id || u._id);
    try {
      // 1. Direct WhatsApp Link Generation (Client Side)
      const phone = u.phone || '';
      const cleanPhone = phone.replace(/\D/g, '').length === 10 ? `91${phone.replace(/\D/g, '')}` : phone.replace(/\D/g, '');
      const msg = `Hi ${u.name || 'Partner'}, this is an automated reminder regarding your digital storefront "${u.shopName || 'Grozy Shop'}" subscription. Please check your dashboard for renewal details.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      
      toast.success('WhatsApp Redirection Triggered!');

      // 2. Generate Beautiful PDF Greeting / Invoice Notice
      const doc = new jsPDF('landscape');
      
      // Background and accent
      doc.setFillColor(28, 28, 28);
      doc.rect(0, 0, 297, 210, 'F');
      
      doc.setFillColor(14, 165, 233); // Brand sky
      doc.rect(0, 0, 20, 210, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.text("PLATFORM RENEWAL NOTICE", 40, 50);
      
      // Greeting
      doc.setFontSize(16);
      doc.setTextColor(14, 165, 233); // Brand sky
      doc.text(`HELLO ${u.name ? u.name.toUpperCase() : 'PARTNER'},`, 40, 80);
      
      // Body
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(14);
      doc.text(`We are thrilled to have your business "${u.shopName || 'Authorised Store'}" on our platform.`, 40, 95);
      
      // Data Calculation
      const daysStr = u.daysRemaining !== null ? `${u.daysRemaining} DAY(S)` : 'SOON';
      const expireStr = u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Immediate';

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text(`TIME REMAINING: ${daysStr}`, 40, 120);
      
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text(`To avoid any service interruptions on your digital storefront, please renew before ${expireStr}.`, 40, 135);
      
      // Footer
      doc.setTextColor(14, 165, 233);
      doc.setFontSize(16);
      doc.text("Thank you for your continued partnership!", 40, 160);
      
      // Save directly
      doc.save(`Renewal_Notice_${u.name ? u.name.replace(/\s+/g, '_') : 'Vendor'}.pdf`);

    } catch (err) {
      toast.error(err.message || 'Failed to dispatch message');
    } finally {
      setIsProcessing(null);
    }
  };

    const handleToggleSponsorship = async (userId, shopId, silent = false) => {
      if (!shopId) {
        toast.error("No shop associated with this vendor");
        return;
      }
      setIsProcessing(userId);
      try {
        const { data } = await api.patch(`/admin/shops/${shopId}/sponsor`);
        if (data.success) {
          if (!silent) toast.success(data.shop.isSponsored ? "✓ Sponsorship Badge Activated!" : "Sponsorship Removed");
          // Update modal in real-time
          setSelectedVendor(prev => prev ? { ...prev, isSponsored: data.shop.isSponsored } : null);
          fetchUsers();
        }
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      } finally {
        setIsProcessing(null);
      }
    };

    const handleToggleBannersAccess = async (userId, shopId, plan = null, silent = false) => {
      if (!shopId) {
        toast.error("No shop associated with this vendor");
        return;
      }
      setIsProcessing(userId);
      try {
        const body = plan === 'revoke' ? { action: 'revoke' } : plan ? { plan } : {};
        const { data } = await api.patch(`/admin/shops/${shopId}/banners-access`, body);
        if (data.success) {
          if (!silent) {
            const isRevoked = !data.shop.bannersEnabled;
            toast.success(isRevoked ? "Banner access revoked" : `✓ ${plan === '30day' ? '30-Day' : '7-Day'} Banner Plan Activated!`);
          }
          // Update modal in real-time
          setSelectedVendor(prev => prev ? { 
            ...prev, 
            bannersEnabled: data.shop.bannersEnabled, 
            bannersEnabledAt: data.shop.bannersEnabledAt,
            bannersPlan: data.shop.bannersPlan,
            bannersExpiresAt: data.shop.bannersExpiresAt
          } : null);
          setModalData(prev => prev ? {
            ...prev,
            bannersEnabled: data.shop.bannersEnabled,
            bannersEnabledAt: data.shop.bannersEnabledAt,
            bannersPlan: data.shop.bannersPlan,
            bannersExpiresAt: data.shop.bannersExpiresAt
          } : null);
          fetchUsers();
        }
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      } finally {
        setIsProcessing(null);
      }
    };

  const [groupByPinCode, setGroupByPinCode] = useState(roleFilter === 'vendor');

  const filteredUsers = showExpiringSoon 
    ? users.filter(u => u.role === 'vendor' && u.daysRemaining !== null && u.daysRemaining <= 5)
    : (selectedPinFilter !== 'all' && roleFilter === 'vendor')
      ? users.filter(u => u.pinCode === selectedPinFilter)
      : users;

  // Unique pin codes
  const uniquePins = useMemo(() => {
    const pins = [...new Set(users.filter(u => u.pinCode && u.pinCode !== 'N/A').map(u => u.pinCode))];
    return pins.sort();
  }, [users]);

  // Fetch area names for unique pins (India Post API)
  useEffect(() => {
    if (uniquePins.length === 0) return;
    const pinsToFetch = uniquePins.filter(p => !pinAreaMap[p]);
    if (pinsToFetch.length === 0) return;

    pinsToFetch.forEach(async (pin) => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const json = await res.json();
        const postOffices = json?.[0]?.PostOffice;
        if (postOffices && postOffices.length > 0) {
          // Get all area names from API for this pin
          const apiAreas = postOffices.map(po => po.Name.toUpperCase());
          
          // Find which of these areas actually exist in our shop addresses
          const shopsInPin = users.filter(u => u.pinCode === pin);
          const activeAreas = apiAreas.filter(area => 
            shopsInPin.some(s => (s.address || '').toUpperCase().includes(area) || (s.shopName || '').toUpperCase().includes(area))
          );

          // If we found specific matches, show them. Otherwise show the District as fallback.
          const finalAreas = activeAreas.length > 0 
            ? [...new Set(activeAreas)].join(", ") 
            : postOffices[0].District;

          setPinAreaMap(prev => ({ ...prev, [pin]: finalAreas }));
        }
      } catch (err) {
        console.warn(`Could not fetch area for PIN ${pin}`);
      }
    });
  }, [uniquePins]);

  // Grouping logic for vendors
  const pinCodeGroups = useMemo(() => {
    if (!groupByPinCode || roleFilter !== 'vendor') return null;
    const groups = {};
    filteredUsers.forEach(u => {
      const pin = u.pinCode || 'Unassigned';
      if (!groups[pin]) groups[pin] = { vendors: [], sponsoredCount: 0 };
      groups[pin].vendors.push(u);
      if (u.isSponsored) groups[pin].sponsoredCount++;
    });
    return groups;
  }, [filteredUsers, groupByPinCode, roleFilter]);

  const handleUpdatePlan = async (shopId, plan, silent = false) => {
    if (!shopId) return toast.error("No shop associated with this vendor");
    setIsProcessing(shopId);
    try {
      const { data } = await api.patch(`/admin/shops/${shopId}/plan`, { 
        subscriptionPlan: plan 
      });
      if (!silent) toast.success(`✓ Plan updated to ${plan.toUpperCase()}`);
      // Update modal in real-time
      setSelectedVendor(prev => prev ? { ...prev, subscriptionPlan: plan } : null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pageTitle = roleFilter === 'vendor' ? 'Vendor Management' : roleFilter === 'customer' ? 'Customer Management' : 'System Users';
  const pageDesc = roleFilter === 'vendor' ? 'Oversee all registered shop owners and businesses.' : 'Manage customer accounts and loyalty profiles.';

  if (loading) return <div className="p-10 text-center font-black text-gray-300 uppercase tracking-widest animate-pulse">Syncing Database...</div>;

  return (
    <div className="flex flex-col min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            {roleFilter === 'vendor' ? 'Vendor' : 'Customer'} <span className="text-sky-500">Management</span>
          </h1>
          <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.3em]">{pageDesc}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {roleFilter === 'vendor' && (
             <button 
               onClick={() => setShowExpiringSoon(!showExpiringSoon)}
               className={`flex items-center gap-2 px-6 py-4 rounded-full transition-all active:scale-95 shadow-lg font-black text-[10px] uppercase tracking-widest ${
                 showExpiringSoon 
                   ? 'bg-rose-500 text-white shadow-rose-200' 
                   : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-500'
               }`}
             >
               <Sparkles size={16} /> {showExpiringSoon ? 'Show All Vendors' : 'Critical Expiry'}
             </button>
           )}
          <button 
            onClick={handleDownloadPDF}
            className={`flex items-center gap-2 px-6 py-4 rounded-full transition-all active:scale-95 shadow-lg font-black text-[10px] uppercase tracking-widest ${
              (selectedPinFilter !== 'all' && roleFilter === 'vendor')
                ? 'bg-sky-500 text-white shadow-sky-100' 
                : 'bg-gray-900 text-white hover:bg-sky-600'
            }`}
          >
            <Download size={16} /> 
            {(selectedPinFilter !== 'all' && roleFilter === 'vendor') ? `PIN ${selectedPinFilter}` : 'Export PDF'}
          </button>

          <div className="bg-white px-6 py-4 rounded-full shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="min-w-[2.5rem] h-10 px-3 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 font-black">
              {users.length}
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</p>
              <p className="text-xs font-black text-gray-900 uppercase tracking-tighter mt-1">{roleFilter === 'vendor' ? 'Vendors' : 'Customers'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden flex flex-col flex-1 min-h-0 relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                  {roleFilter === 'vendor' ? 'Shop / Business' : 'Customer Identity'}
                </th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                  {roleFilter === 'vendor' ? 'Location Area' : 'Joined On'}
                </th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                  {roleFilter === 'vendor' ? 'Operations' : 'Status / Tenure'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedUsers.map(u => (
                <tr 
                  key={u._id} 
                  className="group hover:bg-sky-50/30 transition-all border-b border-gray-50"
                >
                  <td className="px-6 py-4">
                     <p className="font-black text-sm text-gray-900 tracking-tight leading-none uppercase">{roleFilter === 'vendor' ? (u.shopName || u.name) : u.name}</p>
                     <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mt-1.5">{u.email || 'NO EMAIL'}</p>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        {roleFilter === 'vendor' ? (
                          <>
                            <MapPin size={14} className="text-sky-400" />
                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">PIN: {u.pinCode || 'N/A'}</span>
                          </>
                        ) : (
                          <>
                            <Calendar size={14} className="text-gray-300" />
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </span>
                          </>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center justify-between gap-4">
                       {roleFilter !== 'vendor' && (
                         <div className="flex flex-col hidden sm:flex">
                            <span className="text-[10px] font-black text-gray-900 uppercase">
                               {u.createdAt ? `${Math.floor((new Date() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24))} Days` : 'N/A'}
                            </span>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Tenure</span>
                         </div>
                       )}
                       <div className="flex items-center gap-2 w-full justify-end">
                         {roleFilter === 'vendor' ? (
                           <button 
                             onClick={() => { setSelectedVendor(u); setModalData({ ...u }); setIsModified(false); }}
                             className="px-6 py-2 bg-sky-50 text-sky-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all"
                           >
                             Manage Shop
                           </button>
                         ) : (
                           <>
                             <button 
                               onClick={() => handleStatusToggle(u._id || u.id)}
                               className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-rose-50 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                               title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                             >
                               {isProcessing === (u._id || u.id) ? '...' : (u.status === 'active' ? 'Deactivate' : 'Activate')}
                             </button>
                             <button 
                               onClick={() => { setSelectedVendor(u); setIsSafeDeleteOpen(true); }}
                               className="p-2 bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                               title="Delete Account"
                             >
                               <Trash2 size={14} />
                             </button>
                           </>
                         )}
                       </div>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* DETAIL MANAGEMENT MODAL */}
      {selectedVendor && roleFilter === 'vendor' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {/* Backdrop */}
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedVendor(null)} 
          />
          
          {/* Modal */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '560px', background: 'white', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
            
            {/* Close Button */}
            <button 
              onClick={() => { setSelectedVendor(null); setModalData(null); }}
              style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10, width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '900', backdropFilter: 'blur(4px)' }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ padding: '40px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', color: '#e0f2fe', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '8px' }}>Management Console</p>
              <h2 style={{ fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-1px', lineHeight: 1, marginBottom: '12px', marginTop: 0 }}>
                {selectedVendor.shopName || selectedVendor.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#bae6fd', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  📍 {selectedVendor.pinCode || 'Unassigned'}
                </div>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7dd3fc' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#bae6fd', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Owner: {selectedVendor.name || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Body — scrollable */}
            <div style={{ flex: 1, padding: '24px 36px', overflowY: 'auto', minHeight: 0 }}>
              
              {/* Account Status */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '9px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>Account Status</p>
                <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: modalData?.status === 'active' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={22} color="white" />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#111827', margin: 0 }}>Vendor Account</p>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: modalData?.status === 'active' ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '3px 0 0' }}>
                        Status: {modalData?.status === 'active' ? '✓ Active' : 'Suspended'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setModalData(prev => ({ ...prev, status: prev.status === 'active' ? 'suspended' : 'active' })); setIsModified(true); }}
                    style={{ 
                      padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      background: modalData?.status === 'active' ? '#ef4444' : '#10b981',
                      color: 'white', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em'
                    }}
                  >
                    {modalData?.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Software Subscription Details */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '9px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3em', margin: 0 }}>Software Subscription & Billing</p>
                  <button
                    onClick={() => handleManualWhatsApp(modalData)}
                    disabled={!!isProcessing}
                    style={{ background: '#ecfdf5', color: '#059669', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MessageSquare size={12} /> Send Payment Reminder
                  </button>
                </div>
                
                <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Plan</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>{modalData?.softwarePlanName || 'Free Trial'}</span>
                      <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '8px', fontWeight: '900', padding: '2px 6px', borderRadius: '999px', textTransform: 'uppercase' }}>
                        {modalData?.planExpiresAt && new Date(modalData.planExpiresAt) > new Date() ? 'ACTIVE' : 'EXPIRED'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Billing Cycle</p>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: 0 }}>
                      <span style={{ color: '#10b981' }}>Start:</span> {modalData?.planStartedAt ? new Date(modalData.planStartedAt).toLocaleDateString() : 'N/A'} <br/>
                      <span style={{ color: '#ef4444' }}>Expiry:</span> {modalData?.planExpiresAt ? new Date(modalData.planExpiresAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Access Control */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '9px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>Platform Visibility & Access</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  
                  <button 
                    onClick={() => { setModalData(prev => ({ ...prev, subscriptionPlan: 'basic' })); setIsModified(true); }}
                    style={{ 
                      padding: '20px', borderRadius: '20px', border: modalData?.subscriptionPlan === 'basic' ? '2px solid #111827' : '2px solid #f3f4f6',
                      background: modalData?.subscriptionPlan === 'basic' ? '#f9fafb' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: modalData?.subscriptionPlan === 'basic' ? '#111827' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={18} color={modalData?.subscriptionPlan === 'basic' ? 'white' : '#9ca3af'} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>Offline Access</p>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', margin: '3px 0 0' }}>In-Store Only</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setModalData(prev => ({ ...prev, subscriptionPlan: 'premium' })); setIsModified(true); }}
                    style={{ 
                      padding: '20px', borderRadius: '20px', border: modalData?.subscriptionPlan === 'premium' ? '2px solid #0ea5e9' : '2px solid #f3f4f6',
                      background: modalData?.subscriptionPlan === 'premium' ? '#f0f9ff' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: modalData?.subscriptionPlan === 'premium' ? '#0ea5e9' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={18} color={modalData?.subscriptionPlan === 'premium' ? 'white' : '#9ca3af'} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0c4a6e', margin: 0 }}>Online Access</p>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', margin: '3px 0 0' }}>Public Marketplace</p>
                    </div>
                  </button>
                </div>
              </div>



              {/* Offer Banners Access — Plan Selector */}
              {(() => {
                const expiresAt = modalData?.bannersExpiresAt ? new Date(modalData.bannersExpiresAt) : null;
                const now = new Date();
                const isExpired = modalData?.bannersEnabled && expiresAt && now > expiresAt;
                const isActive = modalData?.bannersEnabled && !isExpired;
                const msLeft = expiresAt ? expiresAt - now : 0;
                const daysLeft = expiresAt ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0;
                const hoursLeft = expiresAt ? Math.ceil(msLeft / (1000 * 60 * 60)) : 0;
                const plan = modalData?.bannersPlan || 'none';
                // Warning thresholds
                const warnDays = plan === '1year' ? 14 : plan === '6month' ? 7 : plan === '30day' ? 3 : 2;
                const isWarningSoon = isActive && daysLeft <= warnDays && daysLeft > 0;

                const planDurationLabel = {
                  '7day': '7-Day Plan — ₹200',
                  '30day': '30-Day Plan — ₹600',
                  '6month': '6-Month Plan — ₹3,200',
                  '1year': '1-Year Plan — ₹6,000'
                }[plan] || null;
                const expiryLabel = expiresAt
                  ? expiresAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : null;

                return (
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '9px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>Marketing Features — Offer Banners</p>

                    {/* Status Summary */}
                    <div style={{ background: isActive ? (isWarningSoon ? '#fffbeb' : '#f0f9ff') : isExpired ? '#fef2f2' : '#f8fafc', borderRadius: '16px', padding: '14px 16px', marginBottom: '12px', border: `1px solid ${isActive ? (isWarningSoon ? '#fde68a' : '#bae6fd') : isExpired ? '#fecaca' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isActive ? (isWarningSoon ? '#f59e0b' : '#0ea5e9') : isExpired ? '#ef4444' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={20} color="white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '900', color: '#111827', margin: 0 }}>
                          {isActive ? (planDurationLabel || 'Active Plan') : isExpired ? 'Plan Expired' : 'No Active Plan'}
                        </p>
                        {isActive && expiresAt && (
                          <>
                            <p style={{ fontSize: '9px', fontWeight: '700', color: isWarningSoon ? '#d97706' : '#0ea5e9', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : `${hoursLeft}h left`} — Expires {expiryLabel}
                            </p>
                            {isWarningSoon && (
                              <p style={{ fontSize: '8px', fontWeight: '800', color: '#b45309', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                ⚠ Expiring soon! Contact vendor to renew.
                              </p>
                            )}
                          </>
                        )}
                        {isExpired && expiresAt && (
                          <p style={{ fontSize: '9px', fontWeight: '700', color: '#ef4444', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Expired on {expiryLabel}
                          </p>
                        )}
                        {!isActive && !isExpired && (
                          <p style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select a plan below to grant access</p>
                        )}
                      </div>
                    </div>

                    {/* Extend Section */}
                    {(() => {
                      const expiresAt2 = modalData?.bannersExpiresAt ? new Date(modalData.bannersExpiresAt) : null;
                      const isCurrentlyActive2 = modalData?.bannersEnabled && expiresAt2 && expiresAt2 > new Date();
                      if (!isCurrentlyActive2) return null;

                      const planOptions = [
                        { key: '7day',   label: '+7 Days',   price: '₹200',   ms: 7   * 24 * 60 * 60 * 1000 },
                        { key: '30day',  label: '+30 Days',  price: '₹600',   ms: 30  * 24 * 60 * 60 * 1000 },
                        { key: '6month', label: '+6 Months', price: '₹3,200', ms: 180 * 24 * 60 * 60 * 1000 },
                        { key: '1year',  label: '+1 Year',   price: '₹6,000', ms: 365 * 24 * 60 * 60 * 1000 },
                      ];
                      const fmt = (d) => d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                      return (
                        <div style={{ marginBottom: '24px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: '18px', padding: '18px', border: '1.5px solid #bbf7d0' }}>
                          <p style={{ fontSize: '9px', fontWeight: '900', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '8px' }}>
                            🔄 Extend Current Plan
                          </p>
                          <p style={{ fontSize: '10px', fontWeight: '700', color: '#166534', marginBottom: '12px', lineHeight: 1.4 }}>
                            Like a Jio recharge — new plan stacks on current expiry. Access continues uninterrupted.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {planOptions.map(opt => {
                              const newExpiry = new Date(expiresAt2.getTime() + opt.ms);
                              return (
                                <button
                                  key={opt.key}
                                  onClick={() => handleToggleBannersAccess(modalData._id, modalData.shopId, opt.key)}
                                  disabled={!!isProcessing}
                                  style={{ background: 'white', border: '2px solid #86efac', borderRadius: '12px', padding: '10px 8px', cursor: 'pointer', textAlign: 'left', opacity: isProcessing ? 0.6 : 1 }}
                                >
                                  <p style={{ fontSize: '10px', fontWeight: '900', color: '#166534', margin: 0 }}>{opt.label} — {opt.price}</p>
                                  <p style={{ fontSize: '7px', fontWeight: '700', color: '#16a34a', margin: '3px 0 0', textTransform: 'uppercase' }}>New expiry: {fmt(newExpiry)}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Plan Cards — 2×2 grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>

                      {/* 7-Day Plan */}
                      <button
                        onClick={() => handleToggleBannersAccess(modalData._id, modalData.shopId, '7day')}
                        disabled={!!isProcessing}
                        style={{
                          background: (isActive && plan === '7day') ? '#0ea5e9' : '#f8fafc',
                          border: `2px solid ${(isActive && plan === '7day') ? '#0ea5e9' : '#e2e8f0'}`,
                          borderRadius: '14px', padding: '12px 10px', cursor: 'pointer',
                          textAlign: 'left', transition: 'all 0.2s', opacity: isProcessing ? 0.6 : 1
                        }}
                      >
                        <p style={{ fontSize: '10px', fontWeight: '900', color: (isActive && plan === '7day') ? 'white' : '#111827', margin: 0 }}>7-Day Plan</p>
                        <p style={{ fontSize: '17px', fontWeight: '900', color: (isActive && plan === '7day') ? 'white' : '#0ea5e9', margin: '3px 0 1px', letterSpacing: '-0.03em' }}>₹200</p>
                        <p style={{ fontSize: '7px', fontWeight: '700', color: (isActive && plan === '7day') ? 'rgba(255,255,255,0.75)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                          {(isActive && plan === '7day') ? '✓ Active' : '₹29/day'}
                        </p>
                      </button>

                      {/* 30-Day Plan */}
                      <button
                        onClick={() => handleToggleBannersAccess(modalData._id, modalData.shopId, '30day')}
                        disabled={!!isProcessing}
                        style={{
                          background: (isActive && plan === '30day') ? '#8b5cf6' : '#f8fafc',
                          border: `2px solid ${(isActive && plan === '30day') ? '#8b5cf6' : '#e2e8f0'}`,
                          borderRadius: '14px', padding: '12px 10px', cursor: 'pointer',
                          textAlign: 'left', transition: 'all 0.2s', opacity: isProcessing ? 0.6 : 1
                        }}
                      >
                        <p style={{ fontSize: '10px', fontWeight: '900', color: (isActive && plan === '30day') ? 'white' : '#111827', margin: 0 }}>30-Day Plan</p>
                        <p style={{ fontSize: '17px', fontWeight: '900', color: (isActive && plan === '30day') ? 'white' : '#8b5cf6', margin: '3px 0 1px', letterSpacing: '-0.03em' }}>₹600</p>
                        <p style={{ fontSize: '7px', fontWeight: '700', color: (isActive && plan === '30day') ? 'rgba(255,255,255,0.75)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                          {(isActive && plan === '30day') ? '✓ Active' : '₹20/day'}
                        </p>
                      </button>

                      {/* 6-Month Plan */}
                      <button
                        onClick={() => handleToggleBannersAccess(modalData._id, modalData.shopId, '6month')}
                        disabled={!!isProcessing}
                        style={{
                          background: (isActive && plan === '6month') ? '#f59e0b' : '#f8fafc',
                          border: `2px solid ${(isActive && plan === '6month') ? '#f59e0b' : '#e2e8f0'}`,
                          borderRadius: '14px', padding: '12px 10px', cursor: 'pointer',
                          textAlign: 'left', transition: 'all 0.2s', position: 'relative', opacity: isProcessing ? 0.6 : 1
                        }}
                      >
                        <span style={{ position: 'absolute', top: '7px', right: '7px', background: '#0ea5e9', color: 'white', fontSize: '5px', fontWeight: '900', padding: '2px 5px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>POPULAR</span>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: (isActive && plan === '6month') ? 'white' : '#111827', margin: 0 }}>6-Month Plan</p>
                        <p style={{ fontSize: '17px', fontWeight: '900', color: (isActive && plan === '6month') ? 'white' : '#f59e0b', margin: '3px 0 1px', letterSpacing: '-0.03em' }}>₹3,200</p>
                        <p style={{ fontSize: '7px', fontWeight: '700', color: (isActive && plan === '6month') ? 'rgba(255,255,255,0.75)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                          {(isActive && plan === '6month') ? '✓ Active' : '₹18/day · Save 40%'}
                        </p>
                      </button>

                      {/* 1-Year Plan */}
                      <button
                        onClick={() => handleToggleBannersAccess(modalData._id, modalData.shopId, '1year')}
                        disabled={!!isProcessing}
                        style={{
                          background: (isActive && plan === '1year') ? '#10b981' : '#f8fafc',
                          border: `2px solid ${(isActive && plan === '1year') ? '#10b981' : '#e2e8f0'}`,
                          borderRadius: '14px', padding: '12px 10px', cursor: 'pointer',
                          textAlign: 'left', transition: 'all 0.2s', position: 'relative', opacity: isProcessing ? 0.6 : 1
                        }}
                      >
                        <span style={{ position: 'absolute', top: '7px', right: '7px', background: '#f59e0b', color: 'white', fontSize: '5px', fontWeight: '900', padding: '2px 5px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>BEST VALUE</span>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: (isActive && plan === '1year') ? 'white' : '#111827', margin: 0 }}>1-Year Plan</p>
                        <p style={{ fontSize: '17px', fontWeight: '900', color: (isActive && plan === '1year') ? 'white' : '#10b981', margin: '3px 0 1px', letterSpacing: '-0.03em' }}>₹6,000</p>
                        <p style={{ fontSize: '7px', fontWeight: '700', color: (isActive && plan === '1year') ? 'rgba(255,255,255,0.75)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                          {(isActive && plan === '1year') ? '✓ Active' : '₹16/day · Save 45%'}
                        </p>
                      </button>

                    </div>

                    {/* Revoke Button (only when active) */}
                    {isActive && (
                      <button
                        onClick={() => handleToggleBannersAccess(modalData._id, modalData.shopId, 'revoke')}
                        disabled={!!isProcessing}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '12px', border: '1.5px solid #fecaca',
                          background: '#fef2f2', color: '#ef4444', fontSize: '9px', fontWeight: '900',
                          textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
                          opacity: isProcessing ? 0.6 : 1
                        }}
                      >
                        Revoke Banner Access
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* STICKY FOOTER — always visible, outside scroll area */}
            <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', background: 'white', flexShrink: 0 }}>
              {isModified && (
                <button
                  onClick={async () => {
                    setIsProcessing(modalData._id);
                    try {
                      const planChanged = modalData.subscriptionPlan !== selectedVendor.subscriptionPlan;
                      const statusChanged = modalData.status !== selectedVendor.status;
                      const bannersAccessChanged = modalData.bannersEnabled !== selectedVendor.bannersEnabled;

                      if (planChanged) await handleUpdatePlan(modalData.shopId, modalData.subscriptionPlan, true);
                      if (bannersAccessChanged) await handleToggleBannersAccess(modalData._id, modalData.shopId, modalData.bannersEnabled ? (modalData.bannersPlan || '7day') : 'revoke', true);
                      if (statusChanged) await api.patch(`/admin/users/${modalData._id}/status`, { status: modalData.status });
                      
                      toast.success('✓ Vendor configuration updated successfully');
                      setIsModified(false);
                      setSelectedVendor(null);
                      setModalData(null);
                      fetchUsers();
                    } catch (err) {
                      toast.error('Some changes failed to save');
                    } finally {
                      setIsProcessing(null);
                    }
                  }}
                  disabled={!!isProcessing}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                    background: '#0ea5e9', color: 'white', fontSize: '11px', fontWeight: '900',
                    textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer',
                    boxShadow: '0 8px 16px rgba(14,165,233,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    marginBottom: '10px', animation: 'fadeIn 0.3s'
                  }}
                >
                  {isProcessing ? <RefreshCcw size={15} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Save Configuration
                </button>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleManualWhatsApp(selectedVendor)}
                  style={{ flex: 1, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', fontWeight: '900', color: '#0ea5e9', background: '#f0f9ff', borderRadius: '12px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  <Phone size={14} /> Contact Vendor
                </button>
                <button
                  onClick={() => setIsSafeDeleteOpen(true)}
                  style={{ flex: 1, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', fontWeight: '900', color: '#ef4444', background: '#fef2f2', borderRadius: '12px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Safe Delete Confirmation Modal */}
      {selectedVendor && (
        <SafeDeleteModal 
          isOpen={isSafeDeleteOpen}
          onClose={() => setIsSafeDeleteOpen(false)}
          onConfirm={() => handleDelete(selectedVendor._id)}
          targetName={selectedVendor.shopName || selectedVendor.name}
          targetType={roleFilter === 'vendor' ? 'vendor shop' : 'customer account'}
        />
      )}
    </div>
  );
};

export default Users;
