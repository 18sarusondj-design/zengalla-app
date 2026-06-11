import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../shop/context/StoreContext';
import { CheckCircle2, ChevronLeft, Package, Clock, Phone, XCircle, MessageSquare, MapPin, ChevronDown, Truck, Star } from 'lucide-react';
import FullScreenLoader from '../components/FullScreenLoader';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import CustomerReportModal from '../components/CustomerReportModal';
import ReviewModal from '../components/ReviewModal';
import LeafletMap from '../../common/components/LeafletMap';

const OrderStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orders, cancelOrder, loading, getOrderTracking } = useStore();
  const [isCancelling, setIsCancelling] = useState(false);
  const [shop, setShop] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [trackingData, setTrackingData] = useState(null);

  
  // Get order ID from state (post-checkout) or default to newest order for demo
  const orderId = location.state?.orderId || (orders[0]?._id || orders[0]?.id);
  const order = orders.find(o => (o.id || o._id) === orderId);

  useEffect(() => {
    if (order) {
      const sId = typeof order.shopId === 'object' ? (order.shopId._id || order.shopId.id) : order.shopId;
      if (sId && sId !== '[object Object]') {
        const fetchShop = async () => {
          try {
            const { data } = await api.get(`/shops/${sId}`);
            if (data && data.shop) setShop(data.shop);
          } catch (err) {
            console.error("Error fetching shop:", err);
          }
        };
        fetchShop();
      }
    }
  }, [order?.shopId]);

  useEffect(() => {
    if (order && (order.status === 'OUT_FOR_DELIVERY' || order.status === 'ASSIGNED')) {
      const fetchTracking = async () => {
        const data = await getOrderTracking(order._id || order.id);
        if (data) setTrackingData(data);
      };
      fetchTracking();
      const interval = setInterval(fetchTracking, 15000);
      return () => clearInterval(interval);
    }
  }, [order?.status]);

  const isVal = (loc) => loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && (loc.lat !== 0 || loc.lng !== 0);

  const trackingMarkers = [];
  if (isVal(trackingData?.deliveryLocation)) {
    trackingMarkers.push({
      lat: trackingData.deliveryLocation.lat,
      lng: trackingData.deliveryLocation.lng,
      iconUrl: "https://cdn-icons-png.flaticon.com/512/1239/1239525.png",
      label: "You"
    });
  }
  if (isVal(trackingData?.driverLocation)) {
    trackingMarkers.push({
      lat: trackingData.driverLocation.lat,
      lng: trackingData.driverLocation.lng,
      iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
      label: "Driver"
    });
  }

  const trackingPolyline = isVal(trackingData?.driverLocation) && isVal(trackingData?.deliveryLocation) 
    ? [trackingData.driverLocation, trackingData.deliveryLocation]
    : null;

  useEffect(() => {
    if (order && order.status === 'COMPLETED') {
      const checkReview = async () => {
        try {
          const { data } = await api.get(`/reviews?orderId=${order._id || order.id}`);
          if (data && data.reviews?.length > 0) {
            setHasReviewed(true);
          } else {
            // Auto-trigger review popup if not reviewed yet
            setIsReviewModalOpen(true);
          }
        } catch (err) {
          console.error("Error checking review status:", err);
        }
      };
      checkReview();
    }
  }, [order?.status, order?._id]);
  
  // Show loader while initial data is fetching
  if (loading && !order) {
    return <FullScreenLoader message="Locating your order..." />;
  }

  if (!order) {
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center p-6 text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No active orders</h2>
        <p className="text-gray-500 mb-6 flex-1">You haven't placed any orders recently.</p>
        <button onClick={() => navigate('/')} className="w-full bg-brand-green text-white py-3 rounded-xl font-bold mt-auto mb-4">Start Shopping</button>
      </div>
    );
  }

  const currentStatus = (order.status || '').toUpperCase();
  const stages = [
    { id: 'NEW', label: 'Order Placed', desc: 'Shop has received your order' },
    { id: 'PACKING', label: 'Packing', desc: 'Your items are being packed' },
    { 
      id: order.orderType === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY', 
      label: order.orderType === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup', 
      desc: order.orderType === 'DELIVERY' ? 'Partner is on the way' : 'Visit the shop to collect' 
    },
    { id: 'COMPLETED', label: 'Completed', desc: order.orderType === 'DELIVERY' ? 'Delivered successfully' : 'Order picked up successfully' }
  ];

  const currentIdx = stages.findIndex(s => s.id === currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  const itemsSubtotal = order.items?.reduce((sum, i) => sum + (i.quantity * (i.price || i.product?.price || 0)), 0) || 0;
  const deliveryCharges = order.deliveryFee || (order.totalPrice > itemsSubtotal ? order.totalPrice - itemsSubtotal : 0);
  const platformFee = order.platformFee || 0;
  const totalPayable = itemsSubtotal + deliveryCharges + platformFee;



  const handleCancel = async () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (!reason) {
      toast.error("Cancellation reason is required");
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelOrder(order._id || order.id, reason);
      if (result.success) {
        toast.success("Order cancelled");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-6 w-full max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-3 sticky top-0 z-50 flex items-center shadow-lg border-b border-gray-100">
        <button 
          onClick={() => navigate('/orders')} 
          className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-all active:scale-90"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-black text-xl text-gray-900 flex-1 text-center pr-10 uppercase tracking-tight">Order Status</h1>
      </div>

      <div className="p-3 md:p-6 flex flex-col gap-3">
        
        {/* Success Banner (if just ordered) */}
        {location.state?.orderId && !isCancelled && (
          <div className="bg-emerald-50 rounded-[28px] p-4 flex flex-col items-center justify-center text-center animate-fade-in border border-emerald-100">
            <div className="w-12 h-12 bg-white rounded-[18px] flex items-center justify-center text-emerald-600 mb-2 shadow-lg shadow-emerald-100">
               <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-0.5 tracking-tight uppercase leading-none">Order Received!</h2>
            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest font-mono">Sent to {shop?.name || 'the shop'}</p>
          </div>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="bg-red-50 rounded-[32px] p-6 md:p-8 flex flex-col items-center justify-center text-center animate-fade-in border border-red-100">
            <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-red-500 mb-4 shadow-xl shadow-red-100">
               <XCircle size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight uppercase">Order Cancelled</h2>
            <p className="text-xs font-bold text-red-800 uppercase tracking-widest">This transaction has been terminated.</p>
          </div>
        )}

        {/* Live Tracking Map */}
        {(currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'ASSIGNED') && (
           <div className="bg-white rounded-[40px] p-2 shadow-xl border border-gray-100 overflow-hidden relative group h-[300px] mb-3">
              {isVal(trackingData?.driverLocation) ? (
                <LeafletMap 
                  height="100%"
                  center={trackingData.driverLocation}
                  zoom={15}
                  markers={trackingMarkers}
                  polyline={trackingPolyline}
                  autoDetect={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-lg animate-pulse">
                     <MapPin size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">
                      {trackingData?.isDriverOnline ? 'Initializing GPS...' : 'Partner Offline'}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      {trackingData?.isDriverOnline ? 'Live tracking will appear in a moment' : 'Tracking will resume once partner goes online'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-[24px] shadow-lg flex items-center justify-between border border-white z-[1000]">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center text-white">
                       <Truck size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-900 uppercase">Driver Status</p>
                       <p className={`text-[8px] font-bold uppercase tracking-widest ${trackingData?.driverLocation ? 'text-emerald-500' : trackingData?.isDriverOnline ? 'text-sky-500' : 'text-rose-500'}`}>
                          {trackingData?.driverLocation ? 'Live Tracking Active' : trackingData?.isDriverOnline ? 'GPS Signal Weak...' : 'Partner Offline'}
                       </p>
                    </div>
                 </div>
                 {trackingData?.driverPhone && (
                   <a href={`tel:${trackingData.driverPhone}`} className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Phone size={18} />
                   </a>
                 )}
              </div>
           </div>
        )}

        <div className="bg-white rounded-[40px] p-6 md:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-sky-50 text-sky-600 font-black text-[10px] uppercase px-4 py-2 rounded-bl-[20px] border-l border-b border-sky-100 flex items-center gap-2 shadow-sm">
             <Clock size={14}/> {order.pickupTime}
          </div>
          
          <div className="mt-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 leading-none">Reference ID</p>
            <h3 className="font-black text-gray-900 text-xl mb-4 tracking-tighter uppercase">{order.id}</h3>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
             <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Items</p>
                <p className="text-sm font-black text-gray-900 leading-none">{order.items.length}</p>
             </div>
             <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Value</p>
                <p className="text-xs font-black text-emerald-700 leading-none">₹{totalPayable.toFixed(2)}</p>
             </div>
          </div>
          
          {/* Tracking Timeline */}
          {!isCancelled && (
            <div className="mt-2 flex flex-col gap-4">
              {stages.map((stage, idx) => {
                const isPast = idx < currentIdx || currentStatus === 'COMPLETED';
                const isCurrent = idx === currentIdx && currentStatus !== 'COMPLETED';
                const isFuture = idx > currentIdx && currentStatus !== 'COMPLETED';
                
                return (
                  <div key={stage.id} className="relative flex gap-5">
                    {/* Vertical Line */}
                    {idx !== stages.length - 1 && (
                      <div className={`absolute left-[13px] top-7 w-0.5 h-[calc(100%+16px)] ${isPast ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                    )}
                    
                    {/* Indicator */}
                    <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center z-10 border-2 transition-all duration-500 ${isPast ? 'bg-[#059669] border-[#059669] text-white shadow-lg shadow-emerald-200/50' : isCurrent ? 'bg-white border-[#059669] shadow-[0_0_0_8px_rgba(16,185,129,0.1)]' : 'bg-white border-slate-100'} `}>
                      {isPast ? <CheckCircle2 size={20} strokeWidth={3} /> : (isCurrent ? <div className="w-3.5 h-3.5 rounded-full bg-[#059669] animate-pulse" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />)}
                    </div>
                    
                    {/* Content */}
                    <div className={`flex-1 ${isFuture ? 'opacity-20' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="pb-8">
                          <h4 className={`text-base font-black uppercase tracking-tight ${isCurrent ? 'text-[#059669]' : 'text-slate-900'}`}>{stage.label}</h4>
                          <p className="text-[11px] text-slate-500 font-bold uppercase mt-1 tracking-widest leading-relaxed">{stage.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shop Location & Directions */}
          {shop?.location?.address && (
            <div className="mt-8 pt-6 border-t border-dashed border-gray-100">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">
                      {order.orderType === 'DELIVERY' ? 'Delivery Destination' : 'Shop Location'}
                    </p>
                    <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">
                       {order.orderType === 'DELIVERY' 
                         ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}`
                         : shop.location.address}
                    </p>
                    {order.orderType === 'DELIVERY' && order.deliveryDistance > 0 && (
                      <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest mt-1">
                        Est. Distance: {order.deliveryDistance.toFixed(2)} km
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      const lat = order.orderType === 'DELIVERY' ? order.deliveryLocation?.lat : shop.location.coordinates?.lat;
                      const lng = order.orderType === 'DELIVERY' ? order.deliveryLocation?.lng : shop.location.coordinates?.lng;
                      const addr = order.orderType === 'DELIVERY' ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}` : shop.location.address;
                      
                      if (lat && lng) {
                        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                      } else {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
                      }
                    }}
                    className="shrink-0 bg-brand-primary text-white p-3 rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform"
                    title={order.orderType === 'DELIVERY' ? "View on Map" : "Get Directions"}
                  >
                    <MapPin size={20} />
                  </button>
               </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">

             {/* Wholesale Order Banner */}
             {(() => {
               const hasWholesaleItems = order.items.some(item =>
                 item.product?.wholesalePrice > 0 &&
                 item.quantity >= (item.product?.minimumOrderQuantity || 1)
               );
               if (!hasWholesaleItems) return null;
               return (
                 <div className="mb-4 p-4 bg-sky-50 border border-sky-200 rounded-[20px] flex items-start gap-3 animate-in fade-in">
                   <div className="w-8 h-8 bg-sky-600 rounded-xl flex items-center justify-center shrink-0">
                     <span className="text-white text-[10px] font-black">B2B</span>
                   </div>
                   <div>
                     <p className="text-[11px] font-black text-sky-900 uppercase tracking-widest leading-none mb-1">Wholesale Order Applied</p>
                     <p className="text-[9px] font-bold text-sky-600 leading-relaxed">Some or all items were ordered at wholesale quantity and received B2B pricing. See breakdown below.</p>
                   </div>
                 </div>
               );
             })()}

             <details className="group" open>
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Summary</span>
                  <div className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 transition-transform group-open:rotate-180">
                    <ChevronDown size={14} />
                  </div>
                </summary>
                <div className="mt-4 pb-2">
                   {/* Table Header */}
                   <div className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                      <span className="col-span-7">Items</span>
                      <span className="col-span-1 text-center">Qty</span>
                      <span className="col-span-2 text-right">Rate</span>
                      <span className="col-span-2 text-right">Total</span>
                   </div>

                   {/* Table Body */}
                   <div className="divide-y divide-gray-50">
                      {order.items.map((item, idx) => {
                         const retailPrice = item.product?.price || item.price || 0;
                         const wholesalePrice = item.product?.wholesalePrice || 0;
                         const moq = item.product?.minimumOrderQuantity || 1;
                         const isWholesaleApplied = wholesalePrice > 0 && item.quantity >= moq;
                         const chargedPrice = isWholesaleApplied ? wholesalePrice : retailPrice;

                         return (
                            <div key={idx} className={`px-4 py-3 transition-colors ${isWholesaleApplied ? 'bg-sky-50/40' : 'hover:bg-slate-50'}`}>
                              <div className="grid grid-cols-12 gap-1 items-start">
                                 <div className="col-span-7">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      {isWholesaleApplied ? (
                                        <span className="text-[6px] font-black bg-sky-600 text-white px-1.5 py-0.5 rounded uppercase">B2B</span>
                                      ) : wholesalePrice > 0 ? (
                                        <span className="text-[6px] font-black bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase">B2C</span>
                                      ) : null}
                                      <p className="text-[10px] font-black text-gray-900 uppercase leading-none">{item.name || item.product?.name || 'Item'}</p>
                                    </div>
                                    {wholesalePrice > 0 && (
                                      <p className="text-[8px] font-bold text-sky-500 leading-tight">
                                        {isWholesaleApplied
                                          ? `B2B price applied — Retail was ₹${retailPrice}`
                                          : `Retail price — B2B ₹${wholesalePrice} unlocks at qty ${moq}`}
                                      </p>
                                    )}
                                 </div>
                                 <span className="col-span-1 text-center font-black text-gray-900 text-[10px]">x{parseFloat(Number(item.quantity).toFixed(3))}</span>
                                 <div className="col-span-2 text-right">
                                   <span className={`font-mono font-bold text-[9px] block ${isWholesaleApplied ? 'text-sky-600' : 'text-gray-400'}`}>₹{chargedPrice}</span>
                                   {isWholesaleApplied && (
                                     <span className="font-mono text-[8px] text-gray-300 line-through block">₹{retailPrice}</span>
                                   )}
                                 </div>
                                 <span className="col-span-2 text-right font-black font-mono text-gray-900 text-[10px]">
                                    ₹{(parseFloat(Number(item.quantity).toFixed(3)) * chargedPrice).toFixed(2)}
                                 </span>
                              </div>
                            </div>
                         );
                      })}
                      <div className="space-y-3 px-4 pt-5 border-t-2 border-gray-900/5 mt-4">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Subtotal</span>
                            <span className="text-[7px] font-bold text-gray-300 uppercase mt-1">Sum of Items</span>
                          </div>
                          <span className="text-[12px] font-black text-gray-900 tracking-tighter">
                            ₹{itemsSubtotal.toFixed(2)}
                          </span>
                        </div>

                        {deliveryCharges > 0 && (
                          <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/30">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Delivery Charges</span>
                              <span className="text-[7px] font-bold text-emerald-400 uppercase mt-1">Logistics & Handling</span>
                            </div>
                            <span className="text-[12px] font-black text-emerald-600 tracking-tighter">
                              + ₹{deliveryCharges.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {platformFee > 0 && (
                          <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/30">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Platform Fee</span>
                              <span className="text-[7px] font-bold text-emerald-400 uppercase mt-1">Service & Tech Fee</span>
                            </div>
                            <span className="text-[12px] font-black text-emerald-600 tracking-tighter">
                              + ₹{platformFee.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900 mt-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none">Total Payable</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase mt-1">Inclusive of all taxes</span>
                          </div>
                          <span className="text-3xl font-black text-brand-primary tracking-tighter">₹{totalPayable.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                </div>
             </details>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          {order.status === 'NEW' && !isCancelled ? (
            <button 
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 py-5 rounded-[24px] flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              <XCircle size={20} />
              {isCancelling ? 'Processing...' : 'Abort Order'}
            </button>
          ) : null}
          
          {order.status === 'COMPLETED' && !hasReviewed ? (
            <button 
              onClick={() => setIsReviewModalOpen(true)}
              className="bg-brand-yellow hover:bg-yellow-500 text-gray-900 py-5 rounded-[24px] flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-yellow-100"
            >
              <Star size={20} fill="currentColor" />
              Rate This Order
            </button>
          ) : order.status === 'COMPLETED' && hasReviewed ? (
            <div className="bg-emerald-50 text-emerald-700 py-4 rounded-[24px] flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest border border-emerald-100">
              <CheckCircle2 size={16} />
              Review Submitted
            </div>
          ) : null}
          
          <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-[0.2em] px-12 leading-relaxed">
            Contact the shop immediately for any modifications, inventory issues, or delivery rescheduling.
          </p>
        </div>

      </div>



      {/* Report Modal */}
      <CustomerReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        orderId={orderId}
        shopName={shop?.name}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setHasReviewed(true);
        }}
        order={order}
      />
    </div>
  );
};

export default OrderStatus;
