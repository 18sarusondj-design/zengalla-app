import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { Users as UsersIcon, Search, Trash2, Download, ShieldCheck, ShieldAlert, Sparkles, Clock, Calendar, RefreshCcw, Phone, MessageSquare, Map, Globe, Zap, Award, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import Pagination from '../../common/components/Pagination';
import api from '../../../config/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

      toast.error(`Delete this ${roleFilter || 'user'}?`, {
        action: {
          label: "Confirm Delete",
          onClick: async () => {
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
          }
        }
      });
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
      const msg = `Hi ${u.name || 'Partner'}, this is an automated reminder regarding your digital storefront "${u.shopName || 'Zengalla Shop'}" subscription. Please check your dashboard for renewal details.`;
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

    const handleToggleSponsorship = async (userId, shopId) => {
      if (!shopId) {
        toast.error("No shop associated with this vendor");
        return;
      }
      setIsProcessing(userId);
      try {
        const { data } = await api.patch(`/admin/shops/${shopId}/sponsor`);
        if (data.success) {
          toast.success(data.shop.isSponsored ? "✓ Sponsorship Badge Activated!" : "Sponsorship Removed");
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

  const [groupByPinCode, setGroupByPinCode] = useState(roleFilter === 'vendor');

  const filteredUsers = showExpiringSoon 
    ? users.filter(u => u.role === 'vendor' && u.daysRemaining !== null && u.daysRemaining <= 5)
    : selectedPinFilter !== 'all'
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

  const handleUpdatePlan = async (shopId, plan) => {
    if (!shopId) return toast.error("No shop associated with this vendor");
    setIsProcessing(shopId);
    try {
      const { data } = await api.patch(`/admin/shops/${shopId}/plan`, { 
        subscriptionPlan: plan 
      });
      toast.success(`✓ Plan updated to ${plan.toUpperCase()}`);
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
    <div className="flex flex-col h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-2">{pageTitle}</h1>
        </div>
        
        <div className="flex items-center gap-4">
           {roleFilter === 'vendor' && (
             <button 
               onClick={() => setShowExpiringSoon(!showExpiringSoon)}
               className={`flex items-center gap-2 px-6 py-4 rounded-[24px] transition-all active:scale-95 shadow-lg font-black text-[10px] uppercase tracking-widest ${
                 showExpiringSoon 
                   ? 'bg-rose-500 text-white shadow-rose-200' 
                   : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-500'
               }`}
             >
               <Sparkles size={16} /> {showExpiringSoon ? 'Show All Vendors' : 'Critical Expiry (5 Days)'}
             </button>
           )}
          <button 
            onClick={handleDownloadPDF}
            className={`flex items-center gap-2 px-6 py-4 rounded-[24px] transition-all active:scale-95 shadow-lg font-black text-[10px] uppercase tracking-widest ${
              selectedPinFilter !== 'all' 
                ? 'bg-sky-600 text-white shadow-sky-100 ring-4 ring-sky-50' 
                : 'bg-gray-900 text-white hover:bg-black'
            }`}
          >
            <Download size={16} /> 
            {selectedPinFilter !== 'all' ? `Download PIN ${selectedPinFilter} Report` : 'Download Full Registry'}
          </button>

          <div className="bg-white px-6 py-4 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="min-w-[2.5rem] h-10 px-3 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 font-black">
              {users.length}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</p>
              <p className="text-xs font-black text-gray-900 uppercase tracking-tighter mt-1">{roleFilter === 'vendor' ? 'Vendors' : 'Customers'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden flex flex-col flex-1 min-h-0 relative">
         <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/20">
           <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase">Registered {roleFilter === 'vendor' ? 'Vendors' : 'Customers'}</h2>
           {roleFilter === 'vendor' && uniquePins.length > 0 && (
             <div className="relative">
               {/* Single Filter Button */}
               <button
                 onClick={() => { setPinDropdownOpen(o => !o); setPinSearch(''); }}
                 className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                   selectedPinFilter !== 'all'
                     ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-200'
                     : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:text-sky-600'
                 }`}
               >
                 <MapPin size={13} />
                 {selectedPinFilter === 'all' ? 'Filter by Area' : `PIN: ${selectedPinFilter}`}
                 {selectedPinFilter !== 'all' && (
                   <span
                     onClick={e => { e.stopPropagation(); setSelectedPinFilter('all'); setPinDropdownOpen(false); }}
                     className="ml-1 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center text-[10px] cursor-pointer hover:bg-white/50"
                   >✕</span>
                 )}
                 <span className="opacity-60 text-[10px]">{pinDropdownOpen ? '▲' : '▼'}</span>
               </button>

               {/* Searchable Dropdown */}
               {pinDropdownOpen && (
                 <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                   {/* Search Input */}
                   <div className="p-3 border-b border-gray-100">
                     <input
                       autoFocus
                       type="text"
                       placeholder="Search pin code..."
                       value={pinSearch}
                       onChange={e => setPinSearch(e.target.value)}
                       className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                     />
                   </div>
                   {/* All Areas Option */}
                   <button
                     onClick={() => { setSelectedPinFilter('all'); setPinDropdownOpen(false); }}
                     className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-between ${
                       selectedPinFilter === 'all' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-50'
                     }`}
                   >
                     <span>All Areas</span>
                     <span className="text-[9px] font-bold opacity-50">{users.length} shops</span>
                   </button>
                   {/* Filtered Pin List */}
                   <div className="max-h-56 overflow-y-auto">
                     {uniquePins
                       .filter(p => {
                         const search = pinSearch.toLowerCase();
                         const areaName = (pinAreaMap[p] || '').toLowerCase();
                         return p.includes(search) || areaName.includes(search);
                       })
                       .map(pin => (
                         <button
                           key={pin}
                           onClick={() => { setSelectedPinFilter(pin); setPinDropdownOpen(false); }}
                           className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-between border-t border-gray-50 ${
                             selectedPinFilter === pin ? 'bg-sky-50 text-sky-600' : 'text-gray-700 hover:bg-gray-50'
                           }`}
                         >
                           <span className="flex flex-col">
                             <span className="flex items-center gap-2">
                               <MapPin size={10} className="text-sky-400" />
                               {pin}
                             </span>
                             {pinAreaMap[pin] && (
                               <span className="text-[8px] opacity-70 ml-4 font-black text-sky-500 uppercase tracking-wider">{pinAreaMap[pin]}</span>
                             )}
                           </span>
                           <span className="text-[9px] font-bold text-gray-400">{users.filter(u => u.pinCode === pin).length} shops</span>
                         </button>
                       ))
                     }
                     {uniquePins.filter(p => p.includes(pinSearch)).length === 0 && (
                       <p className="px-4 py-4 text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">No pin codes found</p>
                     )}
                   </div>
                 </div>
               )}

               {/* Click outside to close */}
               {pinDropdownOpen && (
                 <div className="fixed inset-0 z-40" onClick={() => setPinDropdownOpen(false)} />
               )}
             </div>
           )}
         </div>
      <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-100/50 border border-gray-50 overflow-hidden">
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
              {groupByPinCode && roleFilter === 'vendor' && pinCodeGroups ? (
                Object.entries(pinCodeGroups).map(([pin, group]) => (
                  <React.Fragment key={pin}>
                    <tr className="bg-slate-50/50">
                      <td colSpan="3" className="px-10 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Map className="text-sky-500" size={16} />
                            <span className="font-black text-xs uppercase tracking-widest text-gray-700">Pin Code: {pin}</span>
                            <span className="px-3 py-1 bg-white border border-sky-100 text-sky-600 text-[9px] font-black rounded-full shadow-sm">
                              {group.vendors.length} Shops
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {group.vendors.map(u => (
                      <tr 
                        key={u._id} 
                        onClick={() => { setSelectedVendor(u); setModalData({ ...u }); setIsModified(false); }}
                        className="group hover:bg-sky-50/30 transition-all cursor-pointer"
                      >
                        <td className="px-10 py-6">
                           <p className="font-black text-lg text-gray-900 tracking-tight leading-none uppercase group-hover:text-sky-600 transition-colors">{u.shopName || u.name}</p>
                           <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">{u.email || 'NO EMAIL'}</p>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-sky-400" />
                              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">PIN: {u.pinCode || 'N/A'}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <button className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest group-hover:bg-sky-600 group-hover:text-white transition-all">
                              Manage Shop
                           </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                paginatedUsers.map(u => (
                  <tr 
                    key={u._id} 
                    onClick={() => { setSelectedVendor(u); setModalData({ ...u }); setIsModified(false); }}
                    className="group hover:bg-sky-50/30 transition-all cursor-pointer"
                  >
                    <td className="px-10 py-8">
                       <p className="font-black text-lg text-gray-900 tracking-tight leading-none uppercase group-hover:text-sky-600 transition-colors">{u.name}</p>
                       <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1.5">{u.email}</p>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-300" />
                          <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </span>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col">
                          <span className="text-[12px] font-black text-gray-900 uppercase">
                             {u.createdAt ? `${Math.floor((new Date() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24))} Days` : 'N/A'}
                          </span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Platform Tenure</span>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={users.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
      </div>

      {/* DETAIL MANAGEMENT MODAL */}
      {selectedVendor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {/* Backdrop */}
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedVendor(null)} 
          />
          
          {/* Modal */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '560px', background: 'white', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}>
            
            {/* Close Button */}
            <button 
              onClick={() => { setSelectedVendor(null); setModalData(null); }}
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, width: '32px', height: '32px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '900' }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ padding: '32px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', color: '#38bdf8', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '8px' }}>Management Console</p>
              <h2 style={{ fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-1px', lineHeight: 1, marginBottom: '12px', marginTop: 0 }}>
                {selectedVendor.shopName || selectedVendor.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  📍 {selectedVendor.pinCode || 'Unassigned'}
                </div>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#0ea5e9' }} />
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Owner: {selectedVendor.name}
                </div>
              </div>
              {/* Decorative */}
              <div style={{ position: 'absolute', right: '-30px', top: '-30px', opacity: 0.05, fontSize: '150px' }}>⭐</div>
            </div>

            {/* Body */}
            <div style={{ padding: '28px' }}>
              
              {/* Access Control */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '9px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>Platform Visibility & Access</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  
                  <button 
                    onClick={() => { setModalData(prev => ({ ...prev, subscriptionPlan: 'basic' })); setIsModified(true); }}
                    style={{ 
                      padding: '20px', borderRadius: '20px', border: modalData.subscriptionPlan === 'basic' ? '2px solid #111827' : '2px solid #f3f4f6',
                      background: modalData.subscriptionPlan === 'basic' ? '#f9fafb' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: modalData.subscriptionPlan === 'basic' ? '#111827' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={18} color={modalData.subscriptionPlan === 'basic' ? 'white' : '#9ca3af'} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>Offline Access</p>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', margin: '3px 0 0' }}>In-Store Only</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setModalData(prev => ({ ...prev, subscriptionPlan: 'premium' })); setIsModified(true); }}
                    style={{ 
                      padding: '20px', borderRadius: '20px', border: modalData.subscriptionPlan === 'premium' ? '2px solid #0ea5e9' : '2px solid #f3f4f6',
                      background: modalData.subscriptionPlan === 'premium' ? '#f0f9ff' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: modalData.subscriptionPlan === 'premium' ? '#0ea5e9' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={18} color={modalData.subscriptionPlan === 'premium' ? 'white' : '#9ca3af'} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0c4a6e', margin: 0 }}>Online Access</p>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', margin: '3px 0 0' }}>Public Marketplace</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sponsorship */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '9px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>Sponsorship Status</p>
                <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: modalData.isSponsored ? '#10b981' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={22} color={modalData.isSponsored ? 'white' : '#9ca3af'} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#111827', margin: 0 }}>Sponsorship Badge</p>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: modalData.isSponsored ? '#10b981' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '3px 0 0' }}>
                        Status: {modalData.isSponsored ? '✓ Active' : 'None'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setModalData(prev => ({ ...prev, isSponsored: !prev.isSponsored })); setIsModified(true); }}
                    style={{ 
                      padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      background: modalData.isSponsored ? '#ef4444' : '#10b981',
                      color: 'white', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em'
                    }}
                  >
                    {modalData.isSponsored ? 'Remove Badge' : 'Give Sponsor Badge'}
                  </button>
                </div>
              </div>

              {/* SAVE BUTTON (Only if modified) */}
              {isModified && (
                <div style={{ marginBottom: '24px', animation: 'fadeIn 0.3s' }}>
                  <button 
                    onClick={async () => {
                      setIsProcessing(modalData._id);
                      try {
                        // Apply Plan change if different
                        if (modalData.subscriptionPlan !== selectedVendor.subscriptionPlan) {
                          await handleUpdatePlan(modalData.shopId, modalData.subscriptionPlan);
                        }
                        // Apply Sponsorship if different
                        if (modalData.isSponsored !== selectedVendor.isSponsored) {
                          await handleToggleSponsorship(modalData._id, modalData.shopId);
                        }
                        toast.success("All changes saved successfully");
                        setIsModified(false);
                      } catch (err) {
                        toast.error("Some changes failed to save");
                      } finally {
                        setIsProcessing(null);
                      }
                    }}
                    disabled={!!isProcessing}
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                      background: '#0ea5e9', color: 'white', fontSize: '12px', fontWeight: '900',
                      textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer',
                      boxShadow: '0 10px 20px rgba(14, 165, 233, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}
                  >
                    {isProcessing ? <RefreshCcw size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
                    Save Configuration
                  </button>
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button 
                  onClick={() => handleManualWhatsApp(selectedVendor)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: '900', color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  <Phone size={14} /> Contact Vendor
                </button>
                <button 
                  onClick={() => handleDelete(selectedVendor._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: '900', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
