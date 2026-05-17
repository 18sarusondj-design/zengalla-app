import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import {
  Phone, Clock, ShoppingBag, X, MapPin, Trash, Smartphone, Calendar,
  XCircle, MessageSquare, List, ChevronRight, Package, Truck, Store,
  CheckCircle, AlertCircle, Download, Ticket, Gift, RotateCw, Eye, Banknote, Shield, User
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ReceiptTemplate from '../components/ReceiptTemplate';
import Pagination from '../../common/components/Pagination';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import api from '../../../config/api.js';

const LIBRARIES = ['places', 'geometry'];

const notifyPartner = (partner, ord) => {
  if (!partner?.phone) return;
  const shopLoc = ord.shop?.location 
    ? `${ord.shop.location.lat},${ord.shop.location.lng}`
    : encodeURIComponent(ord.shop?.address || ord.shopName || '');
  
  const msg = `🚀 *ORDER PACKED & READY!* \n\n` +
    `Order: #${(ord._id || ord.id || '').toString().slice(-6).toUpperCase()}\n` +
    `Store: ${ord.shop?.name || 'Store'}\n` +
    `Customer: ${ord.customerName}\n\n` +
    `*Action:* Item is packed. Please come and receive the order fast for delivery.\n\n` +
    `📍 *Shop Location:* https://www.google.com/maps/search/?api=1&query=${shopLoc}`;
  
  const phone = partner.phone.replace(/\D/g, '');
  const finalPhone = phone.length === 10 ? `91${phone}` : phone;
  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
};

const notifyOutForDelivery = (partner, ord) => {
  if (!partner?.phone) return;
  
  // 🚚 To Delivery Boy: Customer Location
  const custLoc = ord.customerLocation 
    ? `${ord.customerLocation.lat},${ord.customerLocation.lng}`
    : encodeURIComponent(ord.customerBusinessAddress || ord.address || '');
  
  const dbMsg = `🛵 *EN ROUTE TO CUSTOMER* \n\n` +
    `Order: #${(ord._id || ord.id || '').toString().slice(-6).toUpperCase()}\n` +
    `Customer: ${ord.customerName}\n` +
    `Phone: ${ord.phone}\n\n` +
    `📍 *Customer Location:* https://www.google.com/maps/search/?api=1&query=${custLoc}`;
  
  const dbPhone = partner.phone.replace(/\D/g, '');
  const finalDbPhone = dbPhone.length === 10 ? `91${dbPhone}` : dbPhone;
  window.open(`https://wa.me/${finalDbPhone}?text=${encodeURIComponent(dbMsg)}`, '_blank');

  // 👤 To Customer: Tracking Link
  if (ord.phone) {
    const trackingUrl = `${window.location.origin}/track/${ord._id || ord.id}`;
    const custMsg = `📦 *YOUR ORDER IS OUT FOR DELIVERY!* \n\n` +
      `Hi ${ord.customerName}, your order #${(ord._id || ord.id || '').toString().slice(-6).toUpperCase()} has been picked up and is on the way.\n\n` +
      `🚚 *Live Track:* ${trackingUrl}`;
    
    const custPhone = ord.phone.replace(/\D/g, '');
    const finalCustPhone = custPhone.length === 10 ? `91${custPhone}` : custPhone;
    setTimeout(() => {
      window.open(`https://wa.me/${finalCustPhone}?text=${encodeURIComponent(custMsg)}`, '_blank');
    }, 1000);
  }
};

const getDistance = (loc1, loc2) => {
  if (!loc1 || !loc2 || !window.google) return null;
  try {
    const p1 = new window.google.maps.LatLng(loc1.lat, loc1.lng);
    const p2 = new window.google.maps.LatLng(loc2.lat, loc2.lng);
    const meters = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    return (meters / 1000).toFixed(2); // KM
  } catch (e) {
    return null;
  }
};

const OrderSkeleton = () => (
  <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-6">
      <div className="space-y-3">
        <div className="h-5 w-24 bg-gray-100 rounded-xl"></div>
        <div className="h-3 w-40 bg-gray-50 rounded-lg"></div>
      </div>
      <div className="h-8 w-20 bg-gray-100 rounded-2xl"></div>
    </div>
    <div className="h-32 bg-gray-50/50 rounded-[28px] mb-6"></div>
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="h-10 bg-gray-50 rounded-2xl"></div>
      <div className="h-10 bg-gray-50 rounded-2xl"></div>
    </div>
    <div className="flex gap-3 pt-4 border-t border-gray-50">
      <div className="h-11 w-11 bg-gray-100 rounded-2xl"></div>
      <div className="h-11 flex-1 bg-gray-100 rounded-2xl"></div>
    </div>
  </div>
);

const Orders = () => {
  const {
    orders, updateOrderStatus, updateOrderPayment, deleteOrder,
    bulkDeleteOrders, fetchOrders, getDeliveryPartners, assignOrder,
    vendorShop, fetchVendorShop
  } = useStore();
  const { user, token } = useAuth();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [orderToDownload, setOrderToDownload] = useState(null);
  const [showFleetMap, setShowFleetMap] = useState(false);
  
  useEffect(() => {
    if (showFleetMap) {
      setHasCentered(false); // Trigger re-center when modal opens
    }
  }, [showFleetMap]);
  const [partners, setPartners] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 15.3647, lng: 75.1240 }); // Default to Hubli, Karnataka
  const [hasCentered, setHasCentered] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [viewingImage, setViewingImage] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES
  });

  const [activeStatus, setActiveStatus] = useState(user?.role === 'admin' ? 'PACKING' : 'NEW');
  const [pageStates, setPageStates] = useState({
    NEW: 1,
    PACKING: 1,
    COMPLETED: 1,
    CANCELLED: 1
  });
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 6;

  // 🔄 SYNC: Immediately fetch orders on mount
  React.useEffect(() => {
    handleSync();
    if (user?.role === 'vendor' || user?.role === 'staff') {
      if (!vendorShop) fetchVendorShop();
    }
    fetchPartners();
    const partnersInterval = setInterval(fetchPartners, 10000); // Partners every 10s
    const ordersInterval = setInterval(fetchOrders, 30000); // Orders every 30s
    return () => {
      clearInterval(partnersInterval);
      clearInterval(ordersInterval);
    };
  }, [vendorShop?._id, user?.role]);

  const fetchPartners = async () => {
    try {
      const data = await getDeliveryPartners();
      const allPartners = (data || []);
      setPartners(allPartners);
      
      // Auto-center once if data arrives and we haven't centered yet
      if (!hasCentered && (allPartners.length > 0 || vendorShop?.location)) {
        const firstWithLoc = allPartners.find(p => p.location?.coordinates?.[0] !== 0);
        if (firstWithLoc) {
          setMapCenter({ lat: firstWithLoc.location.coordinates[1], lng: firstWithLoc.location.coordinates[0] });
          setHasCentered(true);
        } else if (vendorShop?.location) {
          setMapCenter(vendorShop.location);
          setHasCentered(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch partners");
    }
  };

  const sendApprovalMessage = (order) => {
    if (!order.phone) return;
    const orderId = (order._id || order.id || '').toString().slice(-6).toUpperCase();
    const msg = `✅ *PAYMENT APPROVED* \n\n` +
                `*Store:* ${vendorShop?.name || 'STORE'}\n` +
                `*Order:* #${orderId}\n` +
                `*Total:* ₹${order.totalPrice}\n` +
                `*Status:* Payment verified. Your order is being processed.`;
    
    const phone = order.phone.replace(/\D/g, '');
    const finalPhone = phone.length === 10 ? `91${phone}` : phone;
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSync = async () => {
    setIsLoading(true);
    setIsSyncing(true);
    setStartDate('');
    setEndDate('');
    await fetchOrders();
    setTimeout(() => {
      setIsSyncing(false);
      setIsLoading(false);
    }, 800);
  };

  const generatePDFReport = (filteredData, title) => {
    const doc = new jsPDF();
    finishPDF(doc, filteredData, title);
  };

  const generateAndDownloadPDF = async (order) => {
    if (!order) return;
    const billId = (order._id || order.id || '').toString();
    const shortId = billId.length > 6 ? billId.slice(-6).toUpperCase() : billId.toUpperCase();

    const toastId = toast.loading(`Generating Receipt #${shortId}...`);
    setOrderToDownload(order);

    setTimeout(async () => {
      try {
        const element = document.getElementById('hidden-receipt-content');
        if (!element) throw new Error('Receipt template not found');

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        if (!imgData || imgData === 'data:,') {
          throw new Error('Canvas rendering produced empty image');
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const fileName = order.phone ? `${order.phone}_${shortId}.pdf` : `Receipt_${shortId}.pdf`;

        // Local Download
        pdf.save(fileName);

        // --- API UPLOAD ---
        const pdfBlob = pdf.output('blob');
        const formData = new FormData();
        formData.append('receipt', pdfBlob, fileName);

        try {
          const { data: uploadRes } = await api.post('/upload/receipt', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (uploadRes.success) {
            toast.success(`Backed up to cloud`, { id: toastId });
          }
        } catch (uploadErr) {
          console.error("Historical Storage Upload Error:", uploadErr);
        }

        toast.success(`Order Completed & Receipt #${shortId} Ready!`, { id: toastId });
        setOrderToDownload(null);
      } catch (err) {
        console.error("PDF Generation Error:", err);
        toast.error('PDF Failed. Try manually downloading.', { id: toastId });
        setOrderToDownload(null);
      }
    }, 800);
  };

  const finishPDF = (doc, data, title) => {
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ["Order ID", "Date", "Customer", "Contact", "Items", "Total", "Status"];
    const tableRows = [];

    data.forEach(item => {
      tableRows.push([
        (item._id || item.id || "").toString().slice(-6).toUpperCase(),
        new Date(item.createdAt || item.created_at).toLocaleDateString(),
        item.customerName || 'Online Customer',
        item.phone || 'N/A',
        item.items?.length || 0,
        `Rs. ${item.totalPrice || item.total || item.total_price}`,
        item.status
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleBulkAction = async (action) => {
    if (!startDate || !endDate) {
      return toast.error("Please select both Start and End dates");
    }

    const filtered = orders.filter(o => {
      const d = new Date(o.createdAt || o.created_at);
      return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59') && o.orderType !== 'IN_STORE_BILL' && o.order_type !== 'IN_STORE_BILL';
    });

    if (filtered.length === 0) {
      return toast.info("No records found for this range");
    }

    if (action === 'DOWNLOAD') {
      generatePDFReport(filtered, "Online Orders History Report");
    } else if (action === 'DELETE') {
      toast.warning(`Delete ${filtered.length} records?`, {
        description: `Permanently delete all orders and bills from ${startDate} to ${endDate}.`,
        action: {
          label: "Delete",
          onClick: async () => {
            const res = await bulkDeleteOrders(startDate, endDate);
            if (res.success) toast.success(res.message);
            else toast.error(res.error);
          }
        }
      });
    }
  };

  const statuses = [
    { id: 'NEW', title: 'New Orders', icon: <Package size={18} />, color: 'text-sky-600', bg: 'bg-sky-50', activeBg: 'bg-sky-600', activeText: 'text-white' },
    { id: 'PACKING', title: 'Packing', icon: <Clock size={18} />, color: 'text-amber-600', bg: 'bg-amber-50', activeBg: 'bg-amber-500', activeText: 'text-white' },
    { id: 'COMPLETED', title: 'Completed', icon: <CheckCircle size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-600', activeText: 'text-white' },
    { id: 'CANCELLED', title: 'Cancelled', icon: <XCircle size={18} />, color: 'text-rose-600', bg: 'bg-rose-50', activeBg: 'bg-rose-600', activeText: 'text-white' },
  ].filter(s => !(user?.role === 'admin' && s.id === 'NEW'));

  // Filtering & Pagination Logic
  const filteredOrders = orders.filter(o => {
    // 🛡️ SECURITY/UX: Super Admin should only see Retail/In-Store orders in this board. B2B is handled separately.
    const isB2B = o.orderType === 'B2B_PROCUREMENT' || o.order_type === 'B2B_PROCUREMENT';
    if (user?.role === 'admin' && isB2B) return false;

    const isBill = o.orderType === 'IN_STORE_BILL' || o.order_type === 'IN_STORE_BILL';
    
    // 🛡️ SECURITY: Admin does not see NEW orders (waiting for vendor acceptance)
    if (user?.role === 'admin' && o.status === 'NEW') return false;

    // 🚚 FLOW: NEW tab includes NEW, ASSIGNED (Vendor sees these)
    // PACKING tab includes PACKING (Vendor accepted), READY (Packed), and OUT_FOR_DELIVERY
    const statusMatch = activeStatus === 'NEW' 
      ? ['NEW', 'ASSIGNED'].includes(o.status) 
      : activeStatus === 'PACKING'
        ? ['PACKING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
        : o.status === activeStatus;

    if (!statusMatch) return false;
    
    // Filter out bills from New/Packing/Cancelled tabs if requested, but keep them in Completed
    if (['NEW', 'PACKING', 'CANCELLED'].includes(activeStatus) && isBill) return false;

    return true;
  });

  const activeOrdersCount = orders.filter(o => {
    const isB2B = o.orderType === 'B2B_PROCUREMENT' || o.order_type === 'B2B_PROCUREMENT';
    if (user?.role === 'admin' && isB2B) return false;
    const isBill = o.orderType === 'IN_STORE_BILL' || o.order_type === 'IN_STORE_BILL';
    if (user?.role === 'admin' && o.status === 'NEW') return false;
    return ['NEW', 'PACKING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY'].includes(o.status) && !isBill;
  }).length;

  const currentPage = pageStates[activeStatus] || 1;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const onPageChange = (newPage) => {
    setPageStates(prev => ({ ...prev, [activeStatus]: newPage }));
  };

  return (
    <div className="flex flex-col min-h-screen p-2 md:p-4 bg-slate-50 font-sans">
      {/* Top Header */}
      <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Orders Board</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic flex items-center gap-2">
              {isSyncing ? (
                <span className="flex items-center gap-1.5 text-sky-600 animate-pulse">
                  <Clock className="animate-spin" size={12} /> Syncing live stream...
                </span>
              ) : (
                "Manage node progression and history logs"
              )}
            </p>
            <button
              onClick={() => setShowFleetMap(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95"
            >
              <MapPin size={12} className="text-sky-500" /> Live Fleet Map
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {activeStatus === 'COMPLETED' && (
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-[24px] border border-gray-100 shadow-sm animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 rounded-xl border border-gray-100">
                <Calendar size={14} className="text-sky-600" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-[10px] font-black uppercase outline-none bg-transparent"
                />
                <span className="text-[10px] font-black text-gray-300">TO</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-[10px] font-black uppercase outline-none bg-transparent"
                />
              </div>
              {startDate && endDate && (
                <button
                  onClick={() => handleBulkAction('DOWNLOAD')}
                  className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-100 active:scale-95 animate-in fade-in zoom-in duration-300"
                >
                  <Download size={14} /> Download
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSync}
            className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center text-sky-600 shadow-md hover:bg-sky-50 transition-all active:scale-90"
            title="Sync Live Orders"
          >
            <RotateCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-w-0">
        <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0 md:overflow-y-auto custom-scrollbar pb-4 lg:pb-0">
          <div className="bg-white rounded-[24px] p-2 shadow-sm border border-gray-100">
            {statuses.map(status => {
              const count = orders.filter(o => {
                // Same logic as filteredOrders for consistency
                const isB2B = o.orderType === 'B2B_PROCUREMENT' || o.order_type === 'B2B_PROCUREMENT';
                if (user?.role === 'admin' && isB2B) return false;
                
                const isBill = o.orderType === 'IN_STORE_BILL' || o.order_type === 'IN_STORE_BILL';

                // 🛡️ SECURITY: Admin does not see NEW orders
                if (user?.role === 'admin' && o.status === 'NEW') return false;
                
                const match = status.id === 'NEW' 
                  ? ['NEW', 'ASSIGNED'].includes(o.status) 
                  : status.id === 'PACKING'
                    ? ['PACKING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
                    : o.status === status.id;

                if (!match) return false;
                if (['NEW', 'PACKING', 'CANCELLED'].includes(status.id) && isBill) return false;
                
                return true;
              }).length;
              const isActive = activeStatus === status.id;
              return (
                <button
                  key={status.id}
                  onClick={() => setActiveStatus(status.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group border ${isActive ? 'border-transparent ' + status.activeBg + ' ' + status.activeText + ' shadow-lg scale-[1.02]' : 'border-gray-50 text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-white'}`}>
                      {status.icon}
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest`}>
                      {status.title}
                    </span>
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${isActive ? 'bg-white/20 border-white/30' : 'bg-gray-50 border-gray-100'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="bg-gradient-to-br from-sky-600 to-sky-500 rounded-[24px] p-5 text-white shadow-xl shadow-sky-100 relative overflow-hidden mt-2">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <ShoppingBag size={48} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Queue Status</p>
            <h3 className="text-xl font-black">{activeOrdersCount} <span className="text-white/40 text-xs font-bold uppercase tracking-widest ml-1">Active</span></h3>
            <div className="w-full bg-black/10 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-white h-full w-2/3 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 rounded-[32px] shadow-sm border border-gray-100 overflow-hidden relative bg-gray-50">
          <div className="px-6 py-4 border-b border-white/60 bg-white/40 backdrop-blur-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${activeStatus === 'NEW' ? 'bg-sky-500' :
                activeStatus === 'PACKING' ? 'bg-amber-500 animate-pulse' :
                  activeStatus === 'READY' ? 'bg-indigo-500' :
                    activeStatus === 'COMPLETED' ? 'bg-emerald-500' :
                      'bg-rose-500'}`}
              />
              <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                {isLoading ? 'Scanning global nodes...' : `Showing ${paginatedOrders.length} of ${filteredOrders.length} ${activeStatus.toLowerCase()} orders`}
              </h2>
            </div>
          </div>

          <div key={activeStatus} className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-4 tab-enter">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <OrderSkeleton key={i} />)}
              </div>
            ) : paginatedOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedOrders.map(order => (
                  <OrderCard
                    key={order._id || order.id}
                    order={order}
                    updateOrderStatus={updateOrderStatus}
                    updateOrderPayment={updateOrderPayment}
                    currentStatus={activeStatus}
                    setSelectedOrder={setSelectedOrder}
                    deleteOrder={deleteOrder}
                    user={user}
                    generateAndDownloadPDF={generateAndDownloadPDF}
                    shop={vendorShop}
                    partners={partners}
                    assignOrder={assignOrder}
                    setOrderToAssign={setOrderToAssign}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-[32px] flex items-center justify-center mb-6">
                  <Package size={40} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-[0.2em] text-gray-900">No Records Found</h3>
                <p className="text-[11px] font-bold uppercase mt-2 text-gray-500">The {activeStatus.toLowerCase()} queue is currently empty</p>
              </div>
            )}
          </div>

          {filteredOrders.length > itemsPerPage && !isLoading && (
            <div className="p-6 border-t border-gray-100 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredOrders.length}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      </div>


      {selectedOrder && (() => {
        const isB2B = selectedOrder.orderType === 'B2B_PROCUREMENT' || selectedOrder.order_type === 'B2B_PROCUREMENT';
        return (
          <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-xl tab-enter">
          <div className="bg-white w-full sm:max-w-6xl h-full sm:h-[90vh] overflow-hidden shadow-2xl flex flex-col sm:rounded-[48px]">
            {/* High-Impact Header */}
            <div className="relative shrink-0 px-10 py-8 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex w-16 h-16 bg-sky-500 rounded-[24px] items-center justify-center shadow-lg shadow-sky-500/20">
                  <Package size={32} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-black text-3xl tracking-tighter uppercase">
                      Order #{(selectedOrder._id || selectedOrder.id || '').toString().slice(-6).toUpperCase()}
                    </h2>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border ${
                      selectedOrder.status === 'NEW' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                      selectedOrder.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>● {selectedOrder.status}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                      {selectedOrder.orderType?.replace(/_/g, ' ') || 'RETAIL ORDER'}
                    </p>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">
                      {selectedOrder.onlineAmount > 0 && selectedOrder.balanceDue > 0 ? 'Partial Payment Flow' : 
                       selectedOrder.onlineAmount > 0 ? 'Full Advance Payment' : 'Post-Paid / Credit Flow'}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="w-10 h-10 sm:w-14 sm:h-14 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
              {/* Left Column: Items List */}
              <div className="flex-[1.5] overflow-y-auto custom-scrollbar p-10 space-y-6">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Inventory Manifest ({(selectedOrder.items || []).length} Items)</h3>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-white rounded-xl transition-all text-slate-400"><List size={16}/></button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item, idx) => {
                    const isExpanded = selectedItem === item;
                    const unitLabel = item.unit || item.product?.unit || (item.sellingType === 'weight' || item.product?.sellingType === 'weight' ? 'kg' : 'pcs');
                    const pricePerUnit = item.price || item.product?.price || 0;
                    const lineTotal = (item.quantity * pricePerUnit).toFixed(2);
                    const taxRate = item.taxRate ?? item.product?.taxRate ?? 0;

                    return (
                      <div key={idx} className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div
                          onClick={() => setSelectedItem(isExpanded ? null : item)}
                          className={`flex justify-between items-center p-5 cursor-pointer transition-all ${isExpanded ? 'bg-slate-900' : ''}`}
                        >
                          <div className="flex gap-5 items-center">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-inner">
                              <img
                                src={item.image || item.product?.imageUrl || item.product?.image || 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'; }}
                              />
                            </div>
                            <div>
                              <p className={`font-black uppercase tracking-tight text-sm mb-1 ${isExpanded ? 'text-white' : 'text-slate-900'}`}>
                                {item.name || item.product?.name || 'Wholesale Item'}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-sky-500 uppercase">QTY: {item.quantity} {unitLabel}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-[10px] font-bold text-slate-400">₹{pricePerUnit} / {unitLabel}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className={`font-black text-lg tracking-tighter ${isExpanded ? 'text-white' : 'text-slate-900'}`}>₹{lineTotal}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Net Total</p>
                            </div>
                            <ChevronRight size={18} className={`${isExpanded ? 'text-white rotate-90' : 'text-slate-300 -rotate-90'} transition-transform`} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-4 gap-px bg-slate-800 border-t border-white/5 tab-enter">
                            <div className="p-5 flex flex-col">
                              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Standard Tax</span>
                              <span className="text-xs font-black text-white uppercase">{taxRate}% GST</span>
                            </div>
                            <div className="p-5 flex flex-col">
                              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Type</span>
                              <span className="text-xs font-black text-white uppercase">{item.sellingType || 'PIECE'}</span>
                            </div>
                            <div className="p-5 flex flex-col">
                              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Unit Type</span>
                              <span className="text-xs font-black text-white uppercase">{unitLabel}</span>
                            </div>
                            <div className="p-5 flex flex-col bg-sky-600">
                              <span className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Final Total</span>
                              <span className="text-sm font-black text-white">₹{lineTotal}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Sidebar Analysis */}
              <div className="w-full lg:w-[420px] bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-y-auto lg:overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                  {/* Customer Card */}
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Buyer Entity</h4>
                    <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl shadow-sm border border-slate-100">
                          {selectedOrder.customerName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-lg uppercase leading-none mb-1">{selectedOrder.customerName}</h3>
                          <div className="flex items-center gap-2">
                            <Phone size={12} className="text-sky-500" />
                            <p className="text-[11px] font-bold text-slate-500">{selectedOrder.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4">
                          {/* Customer Location */}
                          <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-sky-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Destination</p>
                              <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed mb-2">
                                {selectedOrder.customerBusinessAddress || selectedOrder.address || 'Address not provided'}
                              </p>
                              {(selectedOrder.customerLocation || selectedOrder.address) && (
                                <button 
                                  onClick={() => {
                                    const query = selectedOrder.customerLocation 
                                      ? `${selectedOrder.customerLocation.lat},${selectedOrder.customerLocation.lng}`
                                      : encodeURIComponent(selectedOrder.customerBusinessAddress || selectedOrder.address);
                                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                                  }}
                                  className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2 hover:underline"
                                >
                                  Open Destination Map <ChevronRight size={10} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Shop Location */}
                          <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
                            <Store size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dispatching Shop</p>
                              <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed mb-2">
                                {selectedOrder.shop?.name} - {selectedOrder.shop?.address || 'Shop address not provided'}
                              </p>
                              {(selectedOrder.shop?.location || selectedOrder.shop?.address) && (
                                <button 
                                  onClick={() => {
                                    const query = selectedOrder.shop?.location 
                                      ? `${selectedOrder.shop.location.lat},${selectedOrder.shop.location.lng}`
                                      : encodeURIComponent(selectedOrder.shop?.address || selectedOrder.shop?.name);
                                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                                  }}
                                  className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:underline"
                                >
                                  Open Shop Map <ChevronRight size={10} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Distance Calculation */}
                          {selectedOrder.customerLocation && selectedOrder.shop?.location && (
                            <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-2xl border border-sky-100 animate-in zoom-in duration-500">
                              <Truck size={18} className="text-sky-600" />
                              <div>
                                <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Calculated Delivery Distance</p>
                                <p className="text-lg font-black text-sky-900 leading-none">
                                  {getDistance(selectedOrder.shop.location, selectedOrder.customerLocation)} KM
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-slate-300 shrink-0" />
                          <p className="text-[11px] font-black text-slate-900 uppercase">
                            {isB2B ? 'Direct Contact Procurement' : `Window: ${selectedOrder.pickupTime || 'ASAP'}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Payment Verification Section */}
                  {selectedOrder.paymentProofUrl && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Proof</h4>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${selectedOrder.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {selectedOrder.paymentStatus === 'PAID' ? 'Verified' : 'Pending Audit'}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded-[32px] p-4 overflow-hidden relative group">
                        <img 
                          src={selectedOrder.paymentProofUrl} 
                          className="w-full aspect-square object-cover rounded-2xl cursor-pointer hover:opacity-50 transition-all"
                          onClick={() => setViewingImage(selectedOrder.paymentProofUrl)}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-all p-6 text-center">
                           <Eye size={32} className="text-white mb-2" />
                           <p className="text-[10px] font-black text-white uppercase">View Full Scale</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-4">
                         <button 
                           onClick={async () => {
                             const res = await updateOrderPayment(selectedOrder._id || selectedOrder.id, { paymentStatus: 'PAID', isVerified: true });
                             if (res.success) {
                               toast.success("Payment Approved");
                               sendApprovalMessage(selectedOrder);
                             }
                           }}
                           className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                         >Approve</button>
                         <button 
                           onClick={async () => {
                             const res = await updateOrderPayment(selectedOrder._id || selectedOrder.id, { paymentStatus: 'FAILED', paymentProofUrl: '' });
                             if (res.success) toast.error("Proof Rejected");
                           }}
                           className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all"
                         >Reject</button>
                      </div>
                    </section>
                  )}

                  {/* Dispatch Fleet Option */}
                  {(selectedOrder.orderType === 'DELIVERY' || selectedOrder.orderType === 'B2B_PROCUREMENT') && (
                    <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Logistics Management</h4>
                      {partners?.length > 0 ? (
                        (user?.role === 'admin') ? (
                          <button 
                            onClick={() => setOrderToAssign(selectedOrder)}
                            className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-[20px] font-black text-[10px] uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3"
                          >
                            <Truck size={16} /> {selectedOrder.deliveryPartnerId ? 'Reassign Delivery Boy' : 'Assign Delivery Boy'}
                          </button>
                        ) : (
                          <div className="p-4 bg-sky-50 border border-sky-100 rounded-[20px] text-center">
                            <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">Delivery Managed by Super Admin</p>
                          </div>
                        )
                      ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-[20px] text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Fleet Personnel Online</p>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Enhanced Financial Dashboard */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Statement</h4>
                       <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest italic">Live Ledger</span>
                       </div>
                    </div>
                    
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                      {/* Premium Grand Total Header */}
                      <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                         <div className="relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Final Settlement Amount</h4>
                            <p className="text-4xl font-black tracking-tighter">
                               ₹{selectedOrder.totalPrice + (selectedOrder.deliveryFee || 0) + 10}
                            </p>
                         </div>
                         <div className="relative z-10 text-right">
                            <div className="flex items-center gap-2 text-sky-400 mb-2 justify-end">
                               <Shield size={14} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Grand Total</span>
                            </div>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest max-w-[120px] leading-tight">Incl. Items, Logistics & Platform Fee</p>
                         </div>
                      </div>

                      <div className="p-6 space-y-6">
                         {/* Breakdown Section */}
                         <div className="grid grid-cols-2 gap-8 px-2">
                            <div className="space-y-4">
                               <div>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Merchandise</p>
                                  <p className="text-xl font-black text-slate-900">₹{selectedOrder.totalPrice}</p>
                               </div>
                               <div className="flex items-center gap-2 text-sky-600">
                                  <Truck size={12} />
                                  <span className="text-[9px] font-bold uppercase tracking-widest">Logistics Hub</span>
                               </div>
                            </div>
                            <div className="space-y-4 text-right">
                               <div>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Logistics Fee</p>
                                  <p className="text-xl font-black text-slate-900">₹{selectedOrder.deliveryFee || 0}</p>
                               </div>
                               <div>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Platform Fee</p>
                                  <p className="text-xl font-black text-sky-600">₹10</p>
                               </div>
                            </div>
                         </div>

                         {/* Ledger: Payment Status */}
                         <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                            <div className="p-5 bg-sky-50 rounded-[28px] border border-sky-100/50">
                               <p className="text-[8px] font-black text-sky-600 uppercase tracking-widest mb-1">Pre-Paid Online</p>
                               <div className="flex items-baseline gap-1">
                                  <span className="text-xl font-black text-sky-700 tracking-tighter">₹{selectedOrder.onlineAmount || 0}</span>
                                  <span className="text-[8px] font-black text-sky-400/60 uppercase">Received</span>
                               </div>
                            </div>
                            
                            <div className={`p-5 rounded-[28px] border transition-all ${selectedOrder.balanceDue > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                               <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selectedOrder.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {selectedOrder.balanceDue > 0 ? 'Pending Balance' : 'Account Settled'}
                               </p>
                               <div className="flex items-baseline gap-1">
                                  <span className={`text-xl font-black tracking-tighter ${selectedOrder.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                     ₹{selectedOrder.balanceDue || 0}
                                  </span>
                               </div>
                            </div>
                         </div>

                         {/* Shop Reconciliation Note */}
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <Store size={14} className="text-slate-400" />
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shop Reconciliation Fee</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">₹10</span>
                         </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Final Actions Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100">
                   {selectedOrder.balanceDue > 0 ? (
                     <button 
                       onClick={async () => {
                         const res = await updateOrderPayment(selectedOrder._id || selectedOrder.id, { paidAmount: selectedOrder.balanceDue, paymentMethod: 'CASH' });
                         if (res.success) toast.success("Ledger Updated!");
                       }}
                       className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
                     >
                        <Banknote size={18} /> Settle Due Balance
                     </button>
                   ) : (
                     <button 
                       onClick={() => generateAndDownloadPDF(selectedOrder)}
                       className="w-full py-5 bg-sky-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-3"
                     >
                        <Download size={18} /> Download Official Receipt
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {orderToDownload && (
          <div id="hidden-receipt-content" style={{ width: '380px' }}>
            <ReceiptTemplate data={orderToDownload} shop={vendorShop} />
          </div>
        )}
      </div>

      {viewingImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setViewingImage(null)}>
          <div className="relative max-w-4xl w-full h-[80vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={viewingImage} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl" />
            <button onClick={() => setViewingImage(null)} className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white transition-all">
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {showFleetMap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowFleetMap(false)} />
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-[40px] overflow-hidden shadow-2xl flex flex-col tab-enter">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Live Fleet Console</h3>
                <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Real-time partner location tracking</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setHasCentered(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-100 transition-all border border-sky-100"
                >
                  <MapPin size={14} />
                  Re-center Fleet
                </button>
                <button onClick={() => setShowFleetMap(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all">
                  <XCircle size={24} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row">
              <div className="flex-1 relative bg-gray-100">
                {isLoaded ? (
                  <GoogleMap
                    key={showFleetMap ? 'visible' : 'hidden'}
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    onLoad={(map) => {
                      window.mapInstance = map;
                      // Force a resize calculation after a short delay
                      setTimeout(() => {
                        window.google.maps.event.trigger(map, 'resize');
                      }, 100);
                    }}
                    onDragEnd={() => {
                      if (window.mapInstance) {
                        const newCenter = window.mapInstance.getCenter();
                        setMapCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
                      }
                    }}
                    zoom={14}
                    options={{
                      mapTypeId: 'roadmap',
                      styles: [
                        { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
                        { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                        { "featureType": "road", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
                        { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
                      ],
                      disableDefaultUI: false,
                      zoomControl: true,
                      mapTypeControl: true,
                      streetViewControl: true,
                      fullscreenControl: true
                    }}
                  >
                    {vendorShop?.location && (
                      <Marker
                        position={vendorShop.location}
                        icon="https://cdn-icons-png.flaticon.com/512/619/619153.png"
                      />
                    )}

                    {partners.map(p => (
                      p.location?.coordinates?.[0] !== 0 && (
                        <Marker
                          key={p._id}
                          position={{ lat: p.location.coordinates[1], lng: p.location.coordinates[0] }}
                          title={p.name}
                          icon={{
                            url: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
                            scaledSize: new window.google.maps.Size(40, 40)
                          }}
                        />
                      )
                    ))}

                    {selectedPartner && (
                      <InfoWindow
                        position={selectedPartner.currentLocation}
                        onCloseClick={() => setSelectedPartner(null)}
                      >
                        <div className="p-2 min-w-[150px]">
                          <p className="font-black text-gray-900 uppercase text-[10px] tracking-tight">{selectedPartner.name}</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">{selectedPartner.phone}</p>
                          <div className="mt-2 pt-2 border-t flex items-center justify-between">
                            <span className="text-[8px] font-black text-emerald-500 uppercase">Live Now</span>
                            <span className="text-[7px] text-gray-400">{new Date(selectedPartner.currentLocation.lastUpdated).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Initializing Global Feed...</p>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-80 bg-gray-50 border-l border-gray-100 overflow-y-auto p-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Active Fleet ({partners.length})</h4>
                <div className="space-y-4">
                  {partners.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                      <Truck size={32} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No active partners found</p>
                    </div>
                  )}
                  {partners.map(p => (
                    <div
                      key={p._id}
                      onClick={() => p.location?.coordinates?.[0] !== 0 && setMapCenter({ lat: p.location.coordinates[1], lng: p.location.coordinates[0] })}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer ${mapCenter.lat === p.location?.coordinates?.[1] ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-gray-100 hover:border-sky-500 shadow-sm'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${mapCenter.lat === p.location?.coordinates?.[1] ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-black uppercase text-xs tracking-tight ${mapCenter.lat === p.location?.coordinates?.[1] ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${(p.isOnline || p.is_online) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                              {(p.isOnline || p.is_online) ? 'Live Tracking' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {p.location?.coordinates?.[0] !== 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[7px] uppercase font-black opacity-50 mb-0.5">Location ID</span>
                            <span className="text-[9px] font-black truncate max-w-[100px]">{p.location.coordinates[1].toFixed(4)}, {p.location.coordinates[0].toFixed(4)}</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Smartphone size={14} className={ (p.isOnline || p.is_online) ? "text-emerald-400" : "text-gray-400"} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
          @keyframes tab-enter {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .tab-enter {
            animation: tab-enter 0.25s ease-out both;
          }
        `}
      </style>

      {/* Partner Assignment Modal */}
      {orderToAssign && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setOrderToAssign(null)} />
          <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in fade-in duration-300">
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-sky-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Truck size={32} className="text-sky-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Assign Partner</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Select a boy for order #{(orderToAssign._id || orderToAssign.id || '').toString().slice(-6).toUpperCase()}</p>
            </div>

            <div className="px-8 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Fee</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                    <input 
                      type="number"
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black focus:outline-none focus:border-sky-200 transition-all"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Extra Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                    <input 
                      type="number"
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black focus:outline-none focus:border-emerald-200 transition-all"
                      value={extraAmount}
                      onChange={e => setExtraAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 pb-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3">Available Personnel</p>
            </div>

            <div className="p-8 pt-0 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {(() => {
                const partnerOrdersMap = {};
                orders.forEach(o => {
                  if (['ASSIGNED', 'PACKING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status) && o.deliveryPartnerId) {
                    const pid = o.deliveryPartnerId.toString();
                    if (!partnerOrdersMap[pid]) partnerOrdersMap[pid] = [];
                    partnerOrdersMap[pid].push(o);
                  }
                });

                const rankedPartners = partners.map(p => {
                  const pid = (p.id || p._id).toString();
                  const activeOrders = partnerOrdersMap[pid] || [];
                  const distToShop = getDistance(p.currentLocation || p.location, orderToAssign?.shop?.location);
                  
                  let rank = 0; // 0: Free, 1: Same Shop Nearby, 2: Same Shop Far, 3: Busy Diff Shop
                  let statusLabel = 'Available Now';
                  let statusColor = 'text-emerald-600';
                  let dotColor = 'bg-emerald-500';

                  if (activeOrders.length > 0) {
                    const isSameShop = activeOrders.every(ao => 
                      (ao.shopId || ao.shop?._id || ao.shop?.id) === (orderToAssign.shopId || orderToAssign.shop?._id || orderToAssign.shop?.id)
                    );

                    if (isSameShop) {
                      const isNearby = activeOrders.every(ao => {
                        const d = getDistance(ao.customerLocation, orderToAssign.customerLocation);
                        return d && parseFloat(d) <= 3;
                      });

                      if (isNearby) {
                        rank = 1;
                        statusLabel = `Multi-Order (Nearby)`;
                        statusColor = 'text-sky-600';
                        dotColor = 'bg-sky-500';
                      } else {
                        rank = 2;
                        statusLabel = `Same Shop (Busy)`;
                        statusColor = 'text-orange-600';
                        dotColor = 'bg-orange-500';
                      }
                    } else {
                      rank = 3;
                      statusLabel = `Busy (Other Shop)`;
                      statusColor = 'text-rose-500';
                      dotColor = 'bg-rose-500';
                    }
                  }

                  return { ...p, rank, statusLabel, statusColor, dotColor, dist: distToShop, isBusy: activeOrders.length > 0, activeCount: activeOrders.length };
                }).sort((a, b) => {
                  if (a.rank !== b.rank) return a.rank - b.rank;
                  return (parseFloat(a.dist) || 9999) - (parseFloat(b.dist) || 9999);
                });

                if (rankedPartners.length === 0) {
                  return (
                    <div className="py-12 text-center opacity-40">
                      <Truck size={32} className="mx-auto mb-3 text-gray-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Personnel Found</p>
                    </div>
                  );
                }

                return rankedPartners.map(partner => (
                  <button
                    key={partner.id || partner._id}
                    onClick={() => {
                      assignOrder(orderToAssign._id || orderToAssign.id, partner.id || partner._id, parseFloat(deliveryFee || 0), parseFloat(extraAmount || 0));
                      if (orderToAssign.status === 'READY' || orderToAssign.status === 'PACKING') {
                         notifyPartner(partner, orderToAssign);
                      }
                      setOrderToAssign(null);
                      setDeliveryFee('');
                      setExtraAmount('');
                    }}
                    className={`w-full p-4 rounded-[24px] border transition-all flex items-center justify-between active:scale-95 shadow-sm ${
                      partner.rank === 0 ? 'bg-white border-gray-100 hover:bg-gray-50' : 
                      partner.rank === 1 ? 'bg-sky-50/50 border-sky-100 hover:bg-sky-50' :
                      'bg-gray-50/30 border-gray-100 opacity-80 grayscale-[0.5] hover:grayscale-0 hover:bg-white transition-all'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-colors shadow-sm ${
                        partner.rank === 0 ? 'bg-gray-50 text-sky-600' : 
                        partner.rank === 1 ? 'bg-sky-600 text-white' : 
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {partner.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{partner.name}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${partner.dotColor}`} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${partner.statusColor}`}>
                            {partner.statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-lg font-black tracking-tighter ${partner.rank <= 1 ? 'text-sky-600' : 'text-slate-400'}`}>{partner.dist ? `${partner.dist} KM` : '--'}</p>
                       <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">To Shop</p>
                    </div>
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => setOrderToAssign(null)}
              className="w-full p-6 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-rose-500 transition-colors"
            >
              Cancel Assignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;

function OrderCard({ order, updateOrderStatus, updateOrderPayment, currentStatus, setSelectedOrder, deleteOrder, user, generateAndDownloadPDF, shop, partners, assignOrder, setOrderToAssign }) {
  const isBill = order.orderType === 'IN_STORE_BILL' || order.order_type === 'IN_STORE_BILL';
  const isB2B = order.orderType === 'B2B_PROCUREMENT' || order.order_type === 'B2B_PROCUREMENT';
  const isRetail = !isBill && !isB2B;

  let actionLabel = '';
  let nextStatus = '';
  let btnClass = '';

  if (!isBill) {
    if (order.status === 'NEW' || order.status === 'ASSIGNED') {
      actionLabel = 'Accept';
      nextStatus = 'PACKING';
      btnClass = 'bg-sky-600 shadow-sky-900/20';
    } else if (order.status === 'PACKING') {
      actionLabel = 'Ready';
      nextStatus = 'READY';
      btnClass = 'bg-emerald-600 shadow-emerald-900/20';
    }
  }

  const orderId = (order._id || order.id || '').toString().slice(-6).toUpperCase();
  const dateStr = new Date(order.createdAt || order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div 
      onClick={() => setSelectedOrder(order)}
      className="bg-white rounded-[24px] border border-gray-100 p-4 shadow-sm hover:shadow-xl hover:shadow-sky-900/5 transition-all group flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 cursor-pointer"
    >
      {/* Type Indicator Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        isB2B ? 'bg-indigo-500' : isBill ? 'bg-amber-500' : 'bg-sky-500'
      }`} />

      {/* Header Row */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-900 tracking-tighter">#{orderId}</span>
          <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
            order.status === 'NEW' ? 'bg-sky-50 text-sky-600 border-sky-100' :
            order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
            'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
          }`}>
            {order.status === 'READY' ? 'READY TO PICK' : order.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-gray-900 tracking-tighter leading-none">₹{order.totalPrice || 0}</p>
        </div>
      </div>

      {/* Customer & Shop Row */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-sky-50 rounded-md flex items-center justify-center text-[10px] font-black text-sky-600 shrink-0">
            {order.customerName?.charAt(0) || 'G'}
          </div>
          <p className="text-[10px] font-black text-gray-900 uppercase truncate flex-1">{order.customerName || 'Guest'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-50 rounded-md flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">
            <Store size={10} />
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase truncate flex-1">{order.shop?.name || 'Generic Store'}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-50 mt-auto" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setSelectedOrder(order)}
          className={`${user?.role === 'admin' ? 'flex-1' : 'px-3'} h-8 bg-gray-50 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl flex items-center justify-center transition-all border border-gray-100 shadow-sm active:scale-95 text-[9px] font-black uppercase tracking-widest`}
        >
          {user?.role === 'admin' ? 'View Full Order Details' : 'Details'}
        </button>

        {nextStatus && user?.role === 'vendor' ? (
          <button
            onClick={() => {
              updateOrderStatus(order._id || order.id, nextStatus);
              toast.success(`Order #${orderId} set to ${nextStatus.toLowerCase()}`);
              
              // 🔔 NOTIFY: If moving to READY, alert the delivery boy
              if (nextStatus === 'READY' && order.deliveryPartnerId) {
                const partner = partners.find(p => (p.id || p._id) === order.deliveryPartnerId);
                if (partner) notifyPartner(partner, order);
              }

              // 🔔 NOTIFY: If moving to OUT_FOR_DELIVERY (Picked), alert DB and Customer
              if (nextStatus === 'OUT_FOR_DELIVERY' && order.deliveryPartnerId) {
                const partner = partners.find(p => (p.id || p._id) === order.deliveryPartnerId);
                if (partner) notifyOutForDelivery(partner, order);
              }
            }}
            className={`flex-1 h-8 ${btnClass} text-white rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5`}
          >
            {actionLabel} <ChevronRight size={10} strokeWidth={3} />
          </button>
        ) : (
          <div className="flex-1 flex gap-2">
            {order.status === 'COMPLETED' ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateAndDownloadPDF(order);
                  }}
                  className="flex-1 h-8 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={12} /> Receipt
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // WhatsApp Logic...
                  }}
                  className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md"
                >
                  <MessageSquare size={14} />
                </button>
              </>
            ) : (
              user?.role === 'vendor' ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-100">
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Locked</p>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* 🚚 ASSIGN: Available in NEW or PACKING tabs for Super Admin */}
        {(user?.role === 'admin') && (order.status === 'NEW' || order.status === 'PACKING' || order.status === 'READY') && (
          <button
            onClick={() => setOrderToAssign(order)}
            className="w-8 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
            title="Assign Delivery"
          >
            <Truck size={14} />
          </button>
        )}

        {/* 🛡️ SECURITY: Hide delete for Admin as requested */}
        {user?.role !== 'admin' && (user?.role === 'vendor') && (
          <button
            onClick={() => {
              toast.error(`Delete Order #${orderId}?`, {
                action: {
                  label: "Confirm",
                  onClick: () => deleteOrder(order._id || order.id)
                }
              });
            }}
            className="w-8 h-8 bg-gray-50 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-all border border-gray-100"
          >
            <Trash size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
