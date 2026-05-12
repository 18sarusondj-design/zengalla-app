import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { ArrowLeft, Clock, MapPin, User, Phone, CheckCircle2, Store, CreditCard, Plus, Smartphone, Zap, Wallet, Upload, MessageSquare, Ticket, Loader2, X, Shield, ShoppingBag, Truck, Info, HelpCircle, Mail, Gift, Sparkles, IndianRupee, Scan } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import DeliveryLocationModal from '../components/DeliveryLocationModal';


const Checkout = () => {
  const { cartTotal, placeOrder, currentShopId, customerGstin, setCustomerGstin, orders } = useStore();
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || location.state?.couponCode || null);
  const [localDiscount, setLocalDiscount] = useState(location.state?.discount || 0);

  const cartDiscount = localDiscount;
  const appliedCouponCode = typeof appliedCoupon === 'object' ? appliedCoupon?.code : appliedCoupon;

  const [orderType, setOrderType] = useState('PICKUP'); // Default to PICKUP
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); 
  const [paymentGateway, setPaymentGateway] = useState('RAZORPAY'); 
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [activeShop, setActiveShop] = useState(null);
  const isB2BClient = activeShop?.isWholesale && user?.phone && activeShop?.b2bPartners?.some(p => p.phone === user.phone);
  const isPayLaterClient = user?.phone && activeShop?.payLaterPartners?.some(p => p.phone === user.phone);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [distance, setDistance] = useState(0);
  const [isManualMapOpen, setIsManualMapOpen] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [showPaymentGuide, setShowPaymentGuide] = useState(false);
  const [openCouponDrawer, setOpenCouponDrawer] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [razorpayDetails, setRazorpayDetails] = useState(null);
  const [confirmedPayment, setConfirmedPayment] = useState(null); // { amount, proofUrl }

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (openCouponDrawer) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (top) window.scrollTo(0, -parseInt(top || '0'));
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [openCouponDrawer]);

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };

  const isRequestingLocation = React.useRef(false);

  const requestLocation = () => {
    if (isRequestingLocation.current) return;
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    isRequestingLocation.current = true;
    toast.info("Requesting location access for delivery...", { id: 'location-trace' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        isRequestingLocation.current = false;
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        
        if (activeShop?.location?.coordinates) {
          const d = calculateDistance(
            activeShop.location.coordinates.lat,
            activeShop.location.coordinates.lng,
            latitude,
            longitude
          );
          setDistance(d);
          toast.success(`Delivery distance: ${d.toFixed(2)} km`, { id: 'location-trace' });
        }
      },
      (error) => {
        isRequestingLocation.current = false;
        console.error("Location error:", error);
        toast.error("Please enable location access for home delivery", { id: 'location-trace' });
        setOrderType('PICKUP');
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (orderType === 'DELIVERY' && !userCoords && activeShop) {
      requestLocation();
    }
  }, [orderType, activeShop]);


  // Delivery Logic
  const calcDeliveryFee = () => {
    if (orderType !== 'DELIVERY') return 0;
    const threshold = activeShop?.freeDeliveryThreshold ?? 500;
    if (threshold > 0 && cartTotal >= threshold) return 0;
    
    const base = activeShop?.deliveryFee || 0;
    const distancePart = (distance || 0) * (activeShop?.deliveryPricePerKm || 0);
    return base + distancePart;
  };

  const deliveryFee = calcDeliveryFee();
  const platformFee = (orderType === 'DELIVERY' && activeShop?.platformFee) ? Number(activeShop.platformFee) : 0;
  const totalWithFees = cartTotal + deliveryFee + platformFee - cartDiscount;
  const walletDeduction = useWallet ? Math.min(user?.walletBalance || 0, totalWithFees) : 0;
  const finalTotal = Math.round(Math.max(0, totalWithFees - walletDeduction));
  
  // Calculate Pending Balance for Ledger members
  const pendingBalance = useMemo(() => {
    if (!orders || !currentShopId) return 0;
    return orders
      .filter(o => {
        const orderShopId = o.shopId?._id || o.shopId || o.shop?._id || o.shop;
        return String(orderShopId) === String(currentShopId) && 
               o.paymentStatus !== 'PAID' && 
               o.paymentStatus !== 'CANCELLED';
      })
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  }, [orders, currentShopId]);

  useEffect(() => {
    const fetchShopDetails = async () => {
      if (!currentShopId) return;
      setIsLoadingShop(true);
      try {
        const { data } = await api.get(`/shops/${currentShopId}`);

        if (data && data.shop) {
          const shopData = data.shop;
          setActiveShop(shopData);
          
          // Default to Delivery only if shop allows it AND user has enabled it in profile
          const isShopDeliveryDisabled = shopData.hasHomeDelivery === false;
          const isUserDeliveryDisabled = user?.deliveryModeEnabled === false;
          
          if (isShopDeliveryDisabled || isUserDeliveryDisabled) {
            setOrderType('PICKUP');
          } else {
            setOrderType('DELIVERY');
          }

          // Default Payment Method logic
          if (!shopData.razorpayKeyId) {
            setPaymentMethod('COD');
            setPaymentGateway('COD');
          } else {
            setPaymentMethod('RAZORPAY');
            setPaymentGateway('RAZORPAY');
          }
        }
      } catch (err) {
        console.error("Failed to fetch shop details:", err);
      } finally {
        setIsLoadingShop(false);
      }
    };

    fetchShopDetails();
  }, [currentShopId]);
  
  const handleApplyCoupon = () => {
    if (!couponInput) return;
    const code = couponInput.toUpperCase().trim();
    const coupon = (activeShop?.coupons || []).find(c => c.code.toUpperCase() === code && c.isActive);

    if (!coupon) {
      toast.error("Invalid coupon code");
      return;
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      toast.error("This coupon has expired");
      return;
    }

    if (cartTotal < (coupon.minOrderAmount || 0)) {
      toast.error(`Min order of ₹${coupon.minOrderAmount} required for this coupon`);
      return;
    }

    const discountValue = coupon.discountType === 'percentage'
      ? Math.round(cartTotal * (coupon.discountValue / 100))
      : coupon.discountValue;

    setAppliedCoupon(coupon);
    setLocalDiscount(discountValue);
    setCouponInput('');
    toast.success(`Coupon "${code}" applied! Save ₹${discountValue}`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setLocalDiscount(0);
    toast.info("Coupon removed");
  };

  const [formData, setFormData] = useState({
    customerName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    pickupTime: 'ASAP',
    deliveryAddressId: ''
  });

  const [customTime, setCustomTime] = useState('');

  // Addresses state
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Home', street: '', city: '', state: '', zip: '' });

  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      setAddresses(user.addresses);
      if (!formData.deliveryAddressId) {
        setFormData(f => ({ ...f, deliveryAddressId: user.addresses[0]._id || user.addresses[0].id }));
      }
    }
  }, [user?.addresses, formData.deliveryAddressId]);

  const handleAddAddress = async () => {
    if (!newAddress.street || !newAddress.city) return toast.error("Street and City are required");
    
    const addressWithId = { ...newAddress, id: Date.now().toString() };
    const updatedAddresses = [...addresses, addressWithId];
    
    if (user) {
      const res = await updateProfile({ addresses: updatedAddresses });
      if (res.success) {
        setAddresses(updatedAddresses);
        setFormData(f => ({ ...f, deliveryAddressId: addressWithId.id }));
        setIsAddingAddress(false);
        setNewAddress({ label: 'Home', street: '', city: '', state: '', zip: '' });
        toast.success("Address added");
      }
    } else {
      setAddresses(updatedAddresses);
      setFormData(f => ({ ...f, deliveryAddressId: addressWithId.id }));
      setIsAddingAddress(false);
    }
  };



  const handleRazorpayPayment = async () => {
    try {
      setIsInitiatingPayment(true);
      
      // 1. Create Razorpay Order via Backend
      const { data: orderData } = await api.post('/payments/razorpay/order', {
        amount: finalTotal,
        shopId: currentShopId
      });

      if (!orderData) throw new Error('Failed to initiate Razorpay');

      // 2. Open Razorpay Popup
      const cleanPhone = (formData.phone || "").replace(/\D/g, '').slice(-10);
      
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: activeShop?.name || "Grocery Shop",
        description: `Order Payment for ${formData.customerName}`,
        order_id: orderData.id,
        handler: async function (response) {
          // Verify payment on Backend
          try {
            const { data: verifyData } = await api.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              shopId: currentShopId
            });

            if (verifyData?.success) {
              setPaymentConfirmed(true);
              setRazorpayDetails(response);
              toast.success("Payment successful!");
              // Place order directly
              await submitOrder(response);
            } else {
              toast.error("Payment verification failed.");
              setIsInitiatingPayment(false);
            }
          } catch (err) {
            toast.error("Verification error: " + err.message);
            setIsInitiatingPayment(false);
          }
        },
        prefill: {
          name: formData.customerName,
          contact: cleanPhone,
          email: user?.email || ""
        },
        theme: {
          color: "#0ea5e9", // sky-500
        },
        modal: {
          ondismiss: function() {
            setIsInitiatingPayment(false);
          },
          confirm_close: true,
          backdrop_close: true
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: 'UPI Apps / Intent',
                instruments: [
                  {
                    method: 'upi'
                  }
                ],
              },
              vpa: {
                name: 'Manual UPI ID',
                instruments: [
                  {
                    method: 'vpa'
                  }
                ],
              },
            },
            sequence: ['block.banks', 'block.vpa'],
            preferences: {
              show_default_blocks: true
            }
          }
        }
      };

      console.log("Razorpay Options:", options);

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error("Payment failed: " + response.error.description);
        setIsInitiatingPayment(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay Error:", err);
      toast.error(err.message);
      setIsInitiatingPayment(false);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  const submitOrder = async (rzpDetails = null) => {
    try {
      setIsInitiatingPayment(true);
      const finalPickupTime = formData.pickupTime === 'CUSTOM' ? customTime : formData.pickupTime;
      const selectedAddress = orderType === 'DELIVERY' ? addresses.find(a => (a._id || a.id) === formData.deliveryAddressId) : null;
      
      const orderPayload = {
        shopId: currentShopId,
        customerName: formData.customerName || user?.name || 'Guest',
        email: formData.email || user?.email || '',
        phone: formData.phone || user?.phone || '',
        pickupTime: orderType === 'PICKUP' ? finalPickupTime : 'Delivery ASAP',
        orderType,
        paymentMethod: confirmedPayment ? 'ONLINE' : paymentMethod,
        paymentStatus: (paymentMethod === 'COD' && !confirmedPayment) ? 'PENDING' : ((paymentMethod === 'PAY_LATER' || paymentMethod === 'CREDIT') ? 'CREDIT' : 'PAID'),
        paymentGateway: confirmedPayment ? 'UPI_SCAN' : paymentGateway,
        customerGstin,
        razorpayOrderId: (rzpDetails || razorpayDetails)?.razorpay_order_id || '',
        razorpayPaymentId: (rzpDetails || razorpayDetails)?.razorpay_payment_id || '',
        razorpaySignature: (rzpDetails || razorpayDetails)?.razorpay_signature || '',
        paymentProofUrl: confirmedPayment?.proofUrl || '',
        deliveryAddress: selectedAddress,
        deliveryLocation: userCoords,
        deliveryDistance: Number(distance.toFixed(2)),
        deliveryFee: orderType === 'DELIVERY' ? deliveryFee : 0,
        platformFee: orderType === 'DELIVERY' ? platformFee : 0,
        useWalletBalance: useWallet,
        originalTotal: cartTotal + deliveryFee + platformFee - cartDiscount,
        totalPrice: finalTotal,
        couponApplied: appliedCouponCode,
        onlineAmount: confirmedPayment?.amount || 0
      };

      const orderId = await placeOrder(orderPayload);
      if (orderId) {
        setPlacedOrderId(orderId);
        setShowSuccess(true);
        
        // Capture the target shop ID locally before any potential context cleanup
        const targetShopId = currentShopId || activeShop?._id || activeShop?.id;
        
        setTimeout(() => {
          if (targetShopId) {
            navigate(`/shop/${targetShopId}`, { state: { orderSuccess: true, orderId } });
          } else {
            navigate('/'); // Fallback to home if ID is missing
          }
        }, 2000);
      }
    } catch (err) {
      toast.error("Failed to place order. Please try again.");
      console.error("Order error:", err);
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Form data for name/phone is now handled automatically via user context
    if (!formData.customerName && !user?.name) {
      return toast.error("User identification missing. Please re-login.");
    }

    if (orderType === 'DELIVERY' && (!addresses.length || !formData.deliveryAddressId)) {
      return toast.error("Please add a delivery address");
    }

    if (paymentMethod === 'RAZORPAY' && !paymentConfirmed && !isInitiatingPayment) {
      handleRazorpayPayment();
      return;
    }

    // Direct submission for COD or if payment already confirmed
    if (paymentMethod === 'UPI_QR' && !confirmedPayment) {
      setShowQRModal(true);
      return;
    }
    await submitOrder();
  };

  const handleConfirmQRTransfer = async () => {
    if (!paymentProofFile) return toast.error("Please upload payment screenshot");
    
    setIsUploadingProof(true);
    try {
      const pData = new FormData();
      pData.append('image', paymentProofFile);
      const { data } = await api.post('/upload/image', pData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      // Place order with proof URL
      const finalPickupTime = formData.pickupTime === 'CUSTOM' ? customTime : formData.pickupTime;
      const selectedAddress = orderType === 'DELIVERY' ? addresses.find(a => (a._id || a.id) === formData.deliveryAddressId) : null;
      
      const orderPayload = {
        shopId: currentShopId,
        customerName: formData.customerName || user?.name || 'Guest',
        email: formData.email || user?.email || '',
        phone: formData.phone || user?.phone || '',
        pickupTime: orderType === 'PICKUP' ? finalPickupTime : 'Delivery ASAP',
        orderType,
        paymentMethod: 'ONLINE', // Mark as online
        paymentStatus: 'PAID', // Vendor will verify screenshot
        paymentGateway: 'UPI_QR',
        customerGstin,
        paymentProofUrl: data.url,
        deliveryAddress: selectedAddress,
        deliveryLocation: userCoords,
        deliveryDistance: Number(distance.toFixed(2)),
        deliveryFee: orderType === 'DELIVERY' ? deliveryFee : 0,
        platformFee: orderType === 'DELIVERY' ? platformFee : 0,
        useWalletBalance: useWallet,
        originalTotal: cartTotal + deliveryFee + platformFee - cartDiscount,
        totalPrice: finalTotal,
        onlineAmount: finalTotal,
        couponApplied: appliedCouponCode
      };

      const orderId = await placeOrder(orderPayload);
      if (orderId) {
        setPlacedOrderId(orderId);
        setShowSuccess(true);
        setShowQRModal(false);
        const targetShopId = currentShopId || activeShop?._id || activeShop?.id;
        setTimeout(() => {
          navigate(`/shop/${targetShopId}`, { state: { orderSuccess: true, orderId } });
        }, 2000);
      }
    } catch (err) {
      toast.error("Failed to process payment proof");
    } finally {
      setIsUploadingProof(false);
    }
  };

  // QR Code URL based on cart value (kept for reference)
  // const upiId = 'shopowner@upi';
  // const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${upiId}%26pn=Grocery_Store%26am=${cartTotal}%26cu=INR`;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-32 h-32 bg-sky-50 rounded-[48px] flex items-center justify-center mb-8 relative">
           <div className="absolute inset-0 bg-sky-100 rounded-[48px] animate-ping opacity-20"></div>
           <CheckCircle2 size={64} strokeWidth={2.5} className="text-sky-600 relative z-10 animate-bounce" />
        </div>
        
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4 animate-in slide-in-from-bottom-4 duration-700 delay-150">Order Placed!</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-12 animate-in slide-in-from-bottom-4 duration-700 delay-300">Your groceries are being prepared with love.</p>
        
        <div className="bg-gray-50 rounded-3xl p-6 w-full max-w-xs animate-in slide-in-from-bottom-6 duration-700 delay-500">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Order Tracking ID</p>
          <p className="font-mono text-gray-900 font-bold break-all">#{placedOrderId}</p>
        </div>
        
        <div className="mt-12 flex flex-col items-center gap-3 animate-in slide-in-from-bottom-4 duration-700 delay-700">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">
            Thank you! You will receive a digital receipt on WhatsApp from our shop shortly.
          </p>
          
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sky-600 font-bold animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[10px] uppercase tracking-widest">Redirecting to shop...</span>
            </div>
            
            <button 
               onClick={() => navigate(`/shop/${currentShopId || activeShop?._id || activeShop?.id || ''}`)}
               className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-sky-600 transition-colors mt-2"
            >
              Click here if not redirected
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50 font-sans w-full selection:bg-sky-100 selection:text-sky-600">
      
      {/* Premium Hero Header */}
      <div className="fixed top-0 left-0 right-0 z-[60] shadow-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative px-5 pt-6 pb-6 md:pt-8 md:pb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white border border-white/10 transition-all shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">Checkout</h1>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Complete your purchase</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
               <Shield size={12} className="text-emerald-400" />
               <span className="text-[9px] font-black text-white uppercase tracking-widest">Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 mt-[130px] lg:mt-[130px] lg:overflow-hidden lg:h-[calc(100vh-130px)]">
        <form onSubmit={handleSubmit} id="checkout-form" className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:h-full">
          
            {/* Left Side: Forms & Addresses (Scrollable) */}
          <div className="flex-1 lg:w-2/3 pr-2 flex flex-col gap-8 lg:overflow-y-auto lg:pr-6 no-scrollbar">
              
              {activeShop && activeShop.is_active && activeShop.hasHomeDelivery !== false && (activeShop.freeDeliveryThreshold > 0 || activeShop.freeDeliveryThreshold === undefined || activeShop.freeDeliveryThreshold === null) && (
                <div 
                  onClick={() => navigate(`/shop/${currentShopId}`)}
                  className="animate-in slide-in-from-top-4 duration-500 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
                  title="Click to add more items"
                >
                  {cartTotal >= (activeShop.freeDeliveryThreshold ?? 500) ? (
                    <div className="bg-sky-50 border border-sky-100 rounded-[32px] p-6 flex items-center gap-4 shadow-sm shadow-sky-500/5">
                      <div className="bg-sky-500 text-white p-3 rounded-2xl shadow-lg shadow-sky-500/20">
                        <Zap size={22} fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1">Elite Benefit Unlocked</p>
                        <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter">Congratulations! You've qualified for FREE Delivery.</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-100 rounded-[32px] p-6 flex items-center gap-5 shadow-sm">
                      <div className="bg-sky-500 text-white p-4 rounded-2xl shadow-lg shadow-sky-200">
                        <Plus size={22} strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest leading-none">Free Delivery Goal</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase">₹{cartTotal} / ₹{activeShop.freeDeliveryThreshold ?? 500}</p>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-tight">
                          Add ₹{Math.ceil((activeShop.freeDeliveryThreshold ?? 500) - cartTotal)} more for FREE delivery
                        </h3>
                        <div className="w-full h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="h-full bg-sky-500 rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${Math.min(100, (cartTotal / (activeShop.freeDeliveryThreshold ?? 500)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
          
            <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-8">
              {/* Contact Information */}
              <section className="space-y-4">
                <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <Mail size={16} />
                      </div>
                      <input 
                        type="email" 
                        required
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <Phone size={16} />
                      </div>
                      <input 
                        type="tel" 
                        required
                        placeholder="10-digit number"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Order Type Toggle */}
              {isLoadingShop ? (
                <section className="animate-pulse">
                  <div className="h-4 w-24 bg-gray-100 rounded mb-4"></div>
                  <div className="h-14 bg-gray-100 rounded-xl w-full"></div>
                </section>
              ) : (
                <section>
                  <h2 className="text-xs font-black text-gray-900 mb-4 uppercase tracking-[0.2em]">Order Type</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                <button 
                  type="button"
                  onClick={() => setOrderType('PICKUP')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${orderType === 'PICKUP' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <ShoppingBag size={18} /> Store Pickup
                </button>
                {activeShop?.hasHomeDelivery !== false && user?.deliveryModeEnabled !== false && (
                  <button 
                    type="button"
                    onClick={() => {
                      setOrderType('DELIVERY');
                      if (!userCoords) requestLocation();
                    }}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${orderType === 'DELIVERY' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Truck size={18} /> Home Delivery
                  </button>
                )}
              </div>
              {orderType === 'DELIVERY' && user?.deliveryModeEnabled !== false && (
                <div className="mt-3 px-4 py-2 bg-brand-primaryLight/20 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span>📍 Distance: {distance > 0 ? `${distance.toFixed(2)} km` : "Detection pending..."}</span>
                    <button 
                      type="button"
                      onClick={() => setIsManualMapOpen(true)}
                      className="bg-brand-primary text-white px-3 py-1.5 rounded-lg font-black hover:bg-sky-700 transition-all active:scale-95 shadow-sm ml-2 uppercase"
                    >
                      Change location
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    {activeShop?.deliveryPricePerKm > 0 && <span>Rate: ₹{activeShop.deliveryPricePerKm}/km</span>}
                    <span className="bg-brand-primary text-white px-2 py-0.5 rounded-md">Fee: ₹{Math.round(deliveryFee)}</span>
                  </div>
                </div>
              )}
            </section>
          )}



          {/* Dynamic Section: Address OR Pickup Time */}
          {orderType === 'DELIVERY' ? (
            <section className="animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Delivery Address</h2>
                {!isAddingAddress && (
                  <button type="button" onClick={() => setIsAddingAddress(true)} className="text-brand-primary text-sm font-bold flex items-center gap-1">
                    <Plus size={16}/> Add New
                  </button>
                )}
              </div>

              {isAddingAddress ? (
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setNewAddress(a => ({...a, label: 'Home'}))} className={`py-2 text-xs font-bold rounded-lg border ${newAddress.label === 'Home' ? 'bg-brand-primaryLight border-brand-primary text-brand-primary' : 'bg-white border-gray-200 text-gray-500'}`}>Home</button>
                    <button type="button" onClick={() => setNewAddress(a => ({...a, label: 'Work'}))} className={`py-2 text-xs font-bold rounded-lg border ${newAddress.label === 'Work' ? 'bg-brand-primaryLight border-brand-primary text-brand-primary' : 'bg-white border-gray-200 text-gray-500'}`}>Work</button>
                  </div>
                  <input type="text" placeholder="Street / House No." className="w-full text-sm p-3 border rounded-lg focus:ring-1 focus:ring-brand-primary" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="City" className="w-full text-sm p-3 border rounded-lg focus:ring-1 focus:ring-brand-primary" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
                    <input type="text" placeholder="State" className="w-full text-sm p-3 border rounded-lg focus:ring-1 focus:ring-brand-primary" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setIsAddingAddress(false)} className="flex-1 py-2 text-sm text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleAddAddress} className="flex-1 py-2 text-sm text-white bg-brand-primary font-bold rounded-lg hover:bg-sky-700">Save</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.length === 0 ? (
                     <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center text-sm text-gray-500">
                       No addresses saved. <button type="button" onClick={() => setIsAddingAddress(true)} className="text-brand-primary font-bold underline">Add one now</button>
                     </div>
                  ) : (
                    addresses.map(addr => {
                      const addrId = addr._id || addr.id;
                      const isSelected = formData.deliveryAddressId === addrId;
                      return (
                        <div key={addrId} onClick={() => setFormData({...formData, deliveryAddressId: addrId})} className={`p-4 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${isSelected ? 'border-brand-primary bg-brand-primaryLight/30 cursor-default' : 'border-gray-200 bg-white hover:border-brand-primary/50'}`}>
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-brand-primary' : 'border-gray-300'}`}>
                             {isSelected && <div className="w-2.5 h-2.5 bg-brand-primary rounded-full"></div>}
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md mb-1 inline-block">{addr.label}</span>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{addr.street}</p>
                            <p className="text-xs text-gray-500 mt-1">{addr.city}, {addr.state} {addr.zip}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </section>
          ) : (
            <section className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-xs font-black text-gray-900 mb-4 uppercase tracking-[0.2em]">Pickup Location</h2>
                <div className="bg-brand-primaryLight/30 p-4 border border-brand-primaryLight rounded-xl flex gap-3">
                  <div className="bg-white p-2 rounded-full text-brand-primary shadow-sm shrink-0 h-10 w-10 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">Vendor Pickup Point</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-snug">{activeShop?.location?.address || 'Premium Station'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-black text-gray-900 mb-4 uppercase tracking-[0.2em]">Pickup Time</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'ASAP', label: 'As soon as possible', icon: <Clock size={16}/> },
                  { id: '30_MINS', label: 'In 30 minutes', icon: <Clock size={16}/> },
                  { id: '1_HOUR', label: 'In 1 hour', icon: <Clock size={16}/> },
                  { id: 'CUSTOM', label: 'Custom Date & Time', icon: <Clock size={16}/> },
                ].map(option => (
                  <button key={option.id} type="button" onClick={() => setFormData({...formData, pickupTime: option.id})} className={`border rounded-xl p-3 flex flex-col items-start gap-2 transition-all text-left ${formData.pickupTime === option.id ? 'border-brand-primary bg-brand-primaryLight text-brand-primary shadow-sm' : 'border-gray-200 bg-white text-gray-600'}`}>
                    <div className={`p-1.5 rounded-md ${formData.pickupTime === option.id ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'}`}>{option.icon}</div>
                    <span className={`font-semibold text-sm leading-tight ${formData.pickupTime === option.id ? 'text-brand-primary' : 'text-gray-900'}`}>{option.label}</span>
                  </button>
                ))}
              </div>
              {formData.pickupTime === 'CUSTOM' && (
                <div className="mt-3">
                  <input type="datetime-local" required className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-brand-primary" value={customTime} onChange={e => setCustomTime(e.target.value)} />
                </div>
              )}
              </div>
            </section>
          )}


          {/* Wallet Balance Section */}
          {user?.walletBalance > 0 && (
            <section className="bg-sky-600 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group mb-[-1.5rem]">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet size={60} className="-rotate-12" />
               </div>
               <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="font-black text-sm uppercase tracking-widest text-sky-200">Wallet Credits</h2>
                      <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Available: ₹{user.walletBalance}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setUseWallet(!useWallet)}
                      className={`w-14 h-7 rounded-full transition-all relative ${useWallet ? 'bg-sky-400' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${useWallet ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black tracking-tight">₹{walletDeduction}.00 Applied</p>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Pay using your wallet balance</p>
                    </div>
                  </div>
               </div>
            </section>
          )}

          {/* Payment Method */}
          <section>
              <h2 className="text-xs font-black text-gray-900 mb-4 uppercase tracking-[0.2em]">Payment Method</h2>
            <div className="space-y-3">
              {/* Razorpay Option - Only show if shop has Razorpay configured */}
              {activeShop?.razorpayKeyId && (
                <div 
                  onClick={() => {
                    setPaymentMethod('RAZORPAY');
                    setPaymentGateway('RAZORPAY');
                  }}
                  className={`p-5 border-2 rounded-3xl flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'RAZORPAY' ? 'border-brand-primary bg-brand-primaryLight/30 ring-4 ring-brand-primary/5' : 'border-gray-100 hover:border-brand-primary/50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${paymentMethod === 'RAZORPAY' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-gray-100 text-gray-400'}`}>
                      <CreditCard size={24}/>
                    </div>
                    <div>
                      <h3 className={`font-black text-lg uppercase tracking-tight ${paymentMethod === 'RAZORPAY' ? 'text-brand-primary' : 'text-gray-900'}`}>Online Payment</h3>
                      <p className="text-[11px] text-gray-500 mt-1 font-bold italic leading-tight">Fastest & Safest Payment Method</p>
                    </div>
                  </div>
                  {paymentMethod === 'RAZORPAY' && <CheckCircle2 className="text-brand-primary" size={28} />}
                </div>
              )}

              {/* COD Option */}
              <div 
                onClick={() => {
                  setPaymentMethod('COD');
                  setPaymentGateway('COD');
                }}
                className={`p-5 border-2 rounded-3xl flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'COD' ? 'border-brand-primary bg-brand-primaryLight/30 ring-4 ring-brand-primary/5' : 'border-gray-100 hover:border-brand-primary/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${paymentMethod === 'COD' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-gray-100 text-gray-400'}`}>
                    <Wallet size={24}/>
                  </div>
                  <div>
                    <h3 className={`font-black text-lg uppercase tracking-tight ${paymentMethod === 'COD' ? 'text-brand-primary' : 'text-gray-900'}`}>Cash on Delivery</h3>
                    <p className="text-[11px] text-gray-500 mt-1 font-bold italic leading-tight">Pay when you receive your order</p>
                  </div>
                </div>
                {paymentMethod === 'COD' && <CheckCircle2 className="text-brand-primary" size={28} />}
              </div>

              {/* Pay Later Option */}
              {(isB2BClient || isPayLaterClient) && (
                <div 
                  onClick={() => {
                    setPaymentMethod('PAY_LATER');
                    setPaymentGateway('CREDIT');
                  }}
                  className={`p-5 border-2 rounded-3xl flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'PAY_LATER' ? 'border-sky-600 bg-sky-50 ring-4 ring-sky-600/5' : 'border-gray-100 hover:border-sky-600/50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${paymentMethod === 'PAY_LATER' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'bg-gray-100 text-gray-400'}`}>
                      <Shield size={24}/>
                    </div>
                    <div>
                      <h3 className={`font-black text-lg uppercase tracking-tight ${paymentMethod === 'PAY_LATER' ? 'text-sky-600' : 'text-gray-900'}`}>Pay Later (Credit)</h3>
                      <p className="text-[11px] text-gray-500 mt-1 font-bold italic leading-tight">{isB2BClient ? 'Post-payment for whitelisted business partners' : 'Trusted customer credit account'}</p>
                    </div>
                  </div>
                  {paymentMethod === 'PAY_LATER' && <CheckCircle2 className="text-sky-600" size={28} />}
                </div>
              )}

              {/* UPI QR Option */}
              <div 
                onClick={() => {
                  setPaymentMethod('UPI_QR');
                  setPaymentGateway('UPI_QR');
                  setShowQRModal(true);
                }}
                className={`p-5 border-2 rounded-3xl flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'UPI_QR' ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/5' : 'border-gray-100 hover:border-emerald-500/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${paymentMethod === 'UPI_QR' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 text-gray-400'}`}>
                    <Scan size={24}/>
                  </div>
                  <div>
                    <h3 className={`font-black text-lg uppercase tracking-tight ${paymentMethod === 'UPI_QR' ? 'text-emerald-500' : 'text-gray-900'}`}>UPI QR Scanner</h3>
                    <p className="text-[11px] text-gray-500 mt-1 font-bold italic leading-tight">Scan & Pay with any UPI app</p>
                  </div>
                </div>
                {paymentMethod === 'UPI_QR' && <CheckCircle2 className="text-emerald-500" size={28} />}
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button 
                type="button" 
                onClick={() => setShowPaymentGuide(true)}
                className="text-[10px] font-black text-sky-500 hover:text-sky-600 uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
              >
                <div className="w-5 h-5 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100">
                  <HelpCircle size={10} />
                </div>
                How it works?
              </button>
            </div>
          </section>
        </div>
      </div>

          {/* Right Side: Order Summary (Fixed) */}
          <div className="w-full lg:w-1/3 h-fit flex flex-col gap-6 shrink-0">
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
               {/* Account Ledger for Credit/B2B Partners */}
               {(isB2BClient || isPayLaterClient) && (
                 <div className="mb-8 p-5 bg-sky-50 border border-sky-100 rounded-[24px] flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                   <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100">
                        <IndianRupee size={22} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1.5">Account Ledger</p>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Outstanding</h4>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className={`text-xl font-black tracking-tighter leading-none ${pendingBalance > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        ₹{Math.round(pendingBalance)}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">Unpaid Dues</p>
                   </div>
                 </div>
               )}

               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-6">Order Summary</p>
               
               <div className="space-y-4 mb-8">
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                   <span className="text-base font-black text-gray-900 uppercase">₹{Math.round(cartTotal)}</span>
                 </div>
                 
                 {orderType === 'DELIVERY' && (
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Delivery Fee</span>
                     <span className={`text-base font-black uppercase ${deliveryFee === 0 ? 'text-sky-500' : 'text-sky-600'}`}>
                       {deliveryFee === 0 ? 'FREE' : `+₹${Math.round(deliveryFee)}`}
                     </span>
                   </div>
                 )}
                 
                 {/* Apply Coupon Section */}
                   <div className="pt-2">
                     {!appliedCoupon ? (
                       <div className="space-y-3">
                          <div className="bg-gray-50 border border-gray-100 rounded-[20px] p-3 flex items-center gap-3 group focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-50">
                              <Ticket size={16} />
                            </div>
                            <div className="flex-1">
                              <input 
                                type="text" 
                                placeholder="COUPON CODE" 
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                className="w-full bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest placeholder:text-gray-300"
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={handleApplyCoupon}
                              className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all active:scale-95"
                            >
                              Apply
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setOpenCouponDrawer(true)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-dashed border-sky-200 hover:border-sky-400 hover:bg-sky-50 rounded-xl transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <Gift size={15} className="text-sky-500" />
                              <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">View Available Coupons</span>
                            </div>
                            <span className="text-[9px] font-black text-sky-400 bg-sky-100 px-2 py-0.5 rounded-full">
                              {(activeShop?.coupons || []).filter(c => {
                                if (!c.isActive) return false;
                                if (c.expiryDate && new Date(c.expiryDate) < new Date()) return false;
                                return true;
                              }).length}
                            </span>
                          </button>
                        </div>
                     ) : (
                       <div className="bg-emerald-50 border border-emerald-100 rounded-[20px] p-3 flex items-center justify-between group transition-all">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
                             <CheckCircle2 size={16} />
                           </div>
                           <div>
                             <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{appliedCouponCode}</p>
                             <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Applied · −₹{cartDiscount}</p>
                           </div>
                         </div>
                         <button 
                           type="button"
                           onClick={handleRemoveCoupon}
                           className="w-8 h-8 bg-white text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-50"
                         >
                           <X size={14} strokeWidth={3} />
                         </button>
                       </div>
                     )}
                   </div>

                  {cartDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Coupon ({appliedCouponCode})</span>
                      <span className="text-base font-black text-sky-600 uppercase">-₹{Math.round(cartDiscount)}</span>
                    </div>
                  )}

                  {platformFee > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Platform Fee</span>
                      <span className="text-base font-black text-gray-900 uppercase">₹{Math.round(platformFee)}</span>
                    </div>
                  )}

                 {walletDeduction > 0 && (
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Wallet</span>
                     <span className="text-base font-black text-sky-600 uppercase">-₹{Math.round(walletDeduction)}</span>
                   </div>
                 )}
               </div>

               <div className="border-t border-dashed border-gray-100 pt-6 mb-8">
                 <div className="flex justify-between items-baseline">
                   <span className="text-lg font-black text-gray-900 uppercase tracking-tight">Total to Pay</span>
                   <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{finalTotal}</span>
                 </div>
               </div>

                {confirmedPayment && (
                  <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between animate-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase">UPI Paid</p>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Amount: ₹{confirmedPayment.amount}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setConfirmedPayment(null)}
                      className="text-emerald-500 hover:text-rose-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <button 
                 type="submit"
                 disabled={isInitiatingPayment || (paymentMethod === 'UPI_QR' && !confirmedPayment)}
                 className="w-full bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-600 hover:to-sky-800 text-white h-16 rounded-[24px] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-sky-200 hover:shadow-sky-300 disabled:opacity-50 active:scale-95 group"
               >
                 {isInitiatingPayment ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                 ) : (
                   <>
                      <span>{paymentMethod === 'UPI_QR' ? (confirmedPayment ? 'Confirm & Place Order' : 'Scan QR to Pay') : (paymentMethod === 'RAZORPAY' && !paymentConfirmed ? `Pay ₹${finalTotal} & Confirm` : 'Confirm Order')}</span>
                     <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                   </>
                 )}
               </button>

              <div className="mt-6 flex items-center justify-center gap-2">
                <Shield size={14} className="text-sky-500" />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">100% Safe & Secure Payments</span>
              </div>
            </div>

            {/* Shop Offline Warning (Desktop) */}
            {activeShop && (activeShop.is_active === false || activeShop.isOpen === false) && (
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-[28px] flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-rose-600 uppercase tracking-tight leading-none mb-1">Orders Still Accepted</p>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest leading-tight">The shop is currently offline. You can still order; our team will contact you once we open to coordinate delivery or pickup.</p>
                </div>
              </div>
            )}
          </div>
      </form>
    </div>

      <div className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-gray-100 p-4 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-40 lg:hidden animate-in slide-in-from-bottom-10 duration-700">
        <div className="flex flex-col gap-3">
          {/* Breakdown line */}
          <div className="flex items-center justify-between px-3">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Products</span>
              <span className="text-sm font-black text-gray-800">₹{Math.round(cartTotal)}</span>
            </div>
            {orderType === 'DELIVERY' && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Delivery</span>
                <span className="text-sm font-black text-sky-500">+₹{Math.round(deliveryFee)}</span>
              </div>
            )}
            <div className="h-8 w-px bg-gray-100 mx-1 opacity-50"></div>
            <div className="flex flex-col items-end">
              <p className="text-[8px] text-sky-500 font-black uppercase tracking-widest leading-none mb-1">Total to Pay</p>
              <p className="text-2xl font-black tracking-tighter text-gray-900 leading-none">₹{finalTotal}</p>
            </div>
          </div>

          <button 
            form="checkout-form"
            type="submit"
            disabled={isInitiatingPayment || (paymentMethod === 'UPI_QR' && !confirmedPayment)}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-700 text-white h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-sky-200 disabled:opacity-50 active:scale-95 transition-all"
          >
            <span>{isInitiatingPayment ? 'Processing...' : (paymentMethod === 'RAZORPAY' && !paymentConfirmed ? `Pay ₹${finalTotal} & Confirm` : 'Confirm Order')}</span>
            {!isInitiatingPayment && <ArrowLeft size={16} className="rotate-180" />}
          </button>
        </div>
      </div>

      {/* Processing Overlay */}
      {isInitiatingPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center mb-4 border border-white/20">
            <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest animate-pulse">
            {paymentMethod === 'RAZORPAY' ? 'Processing Payment' : 'Placing Order'}
          </h2>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">
            {paymentMethod === 'RAZORPAY' ? 'Connecting to Secure Payment Gateway...' : 'Finalizing your order with the shop...'}
          </p>
        </div>
      )}

      {/* Manual Location Modal */}
      <DeliveryLocationModal 
        isOpen={isManualMapOpen}
        onClose={() => setIsManualMapOpen(false)}
        initialCoords={userCoords}
        shopLocation={activeShop?.location?.coordinates}
        onConfirm={(newCoords) => {
          setUserCoords(newCoords);
          if (activeShop?.location?.coordinates) {
            const d = calculateDistance(
              activeShop.location.coordinates.lat,
              activeShop.location.coordinates.lng,
              newCoords.lat,
              newCoords.lng
            );
            setDistance(d);
            toast.success(`Location updated manually! New distance: ${d.toFixed(2)} km`);
          }
        }}
      />
      {/* Payment Guide Modal */}
      {showPaymentGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPaymentGuide(false)}></div>
          <div className="relative w-full max-w-lg animate-in zoom-in duration-300">
            <button 
              onClick={() => setShowPaymentGuide(false)}
              className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase tracking-widest text-[10px] hover:text-sky-400 transition-colors"
            >
              Close <X size={20} strokeWidth={3} />
            </button>

            {paymentMethod === 'RAZORPAY' ? (
              <div className="p-8 bg-gray-900 rounded-[40px] text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-500/20">
                     <Shield size={24} className="text-white" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black uppercase tracking-tight text-white leading-none mb-1">Online Payment Guide</h3>
                     <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Powered by Razorpay</p>
                   </div>
                </div>

                <div className="space-y-8 relative z-10">
                   <div className="flex gap-5">
                     <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-[12px] font-black shrink-0 border border-white/20 shadow-xl">1</div>
                     <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Tap "Pay & Confirm"</h4>
                       <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">Click the button below to launch our secure, encrypted payment gateway.</p>
                     </div>
                   </div>
                   <div className="flex gap-5">
                     <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-[12px] font-black shrink-0 border border-white/20 shadow-xl">2</div>
                     <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Choose UPI App</h4>
                       <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">Instantly pay using your preferred app like <span className="text-white">PhonePe, Google Pay, or Paytm</span>.</p>
                     </div>
                   </div>
                   <div className="flex gap-5">
                     <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-[12px] font-black shrink-0 border border-white/20 shadow-xl">3</div>
                     <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Instant Confirmation</h4>
                       <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">Once paid, our system <span className="text-emerald-400">immediately verifies</span> and confirms your order.</p>
                     </div>
                   </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center gap-6 grayscale opacity-40">
                   <div className="flex flex-col items-center">
                     <Smartphone size={24} />
                     <span className="text-[8px] font-black mt-2 uppercase tracking-widest">UPI</span>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <div className="flex flex-col items-center">
                     <CreditCard size={24} />
                     <span className="text-[8px] font-black mt-2 uppercase tracking-widest">Cards</span>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <div className="flex flex-col items-center">
                     <Zap size={24} />
                     <span className="text-[8px] font-black mt-2 uppercase tracking-widest">Fast</span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-gray-900 rounded-[40px] text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20">
                     <Wallet size={24} className="text-white" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black uppercase tracking-tight text-white leading-none mb-1">Cash on Delivery</h3>
                     <p className="text-[9px] font-black text-brand-primaryLight uppercase tracking-widest">Pay at doorstep</p>
                   </div>
                </div>

                <div className="space-y-8 relative z-10">
                   <div className="flex gap-5">
                     <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-[12px] font-black shrink-0 border border-white/20 shadow-xl">1</div>
                     <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Tap "Confirm Order"</h4>
                       <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">Place your order without any upfront payment or credit card details.</p>
                     </div>
                   </div>
                   <div className="flex gap-5">
                     <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-[12px] font-black shrink-0 border border-white/20 shadow-xl">2</div>
                     <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Shop Preparation</h4>
                       <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">The vendor will verify your items and start <span className="text-white">packing</span> your order immediately.</p>
                     </div>
                   </div>
                   <div className="flex gap-5">
                     <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-[12px] font-black shrink-0 border border-white/20 shadow-xl">3</div>
                     <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Payment at Hand</h4>
                       <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">
                         {orderType === 'DELIVERY' 
                           ? <>Keep the exact <span className="text-emerald-400">cash amount</span> ready when the delivery partner arrives.</>
                           : <>Keep the <span className="text-emerald-400">cash ready</span> to pay at the shop counter when you arrive.</>
                         }
                       </p>
                     </div>
                   </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center gap-6 grayscale opacity-40">
                   <div className="flex flex-col items-center">
                     <Wallet size={24} />
                     <span className="text-[8px] font-black mt-2 uppercase tracking-widest">Cash</span>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <div className="flex flex-col items-center">
                     <CheckCircle2 size={24} />
                     <span className="text-[8px] font-black mt-2 uppercase tracking-widest">
                       {orderType === 'DELIVERY' ? 'Doorstep' : 'In-Store'}
                     </span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Coupon Drawer Overlay */}
      {openCouponDrawer && (() => {
        const drawerCoupons = (activeShop?.coupons || []).filter(c => {
          if (!c.isActive) return false;
          if (c.expiryDate && new Date(c.expiryDate) < new Date()) return false;
          return true;
        });

        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm"
              onClick={() => setOpenCouponDrawer(false)}
              style={{ touchAction: 'none' }}
            />
            <div
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[201] bg-white rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-hidden flex flex-col"
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="relative overflow-hidden pt-8 pb-6 px-6">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-sky-500 to-indigo-600 opacity-95" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-400/20 rounded-full blur-xl -ml-12 -mb-12" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                      <Gift size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Available Coupons</h3>
                      <p className="text-[10px] font-black text-sky-100/60 uppercase tracking-[0.2em] mt-1.5">{activeShop?.name} • {drawerCoupons.length} Exclusive Offer{drawerCoupons.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenCouponDrawer(false)}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20 transition-all backdrop-blur-md active:scale-90"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-6 space-y-4 custom-scrollbar-visible">
                {drawerCoupons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                      <Ticket size={32} className="text-slate-300 rotate-12" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">No Active Offers</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[200px]">Check back later for new savings and promotions.</p>
                  </div>
                ) : (
                  drawerCoupons.map(c => {
                    const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                    const meetsMin = !isExpired && cartTotal >= (c.minOrderAmount || 0);
                    const stillNeeds = (c.minOrderAmount || 0) - cartTotal;

                    return (
                      <div
                        key={c.code}
                        className={`group rounded-[32px] border-2 transition-all duration-300 overflow-hidden relative ${
                          meetsMin 
                            ? 'border-sky-100 bg-white shadow-lg shadow-sky-500/5 hover:border-sky-300' 
                            : 'border-slate-100 bg-slate-50/50 grayscale opacity-70'
                        }`}
                      >
                        <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          meetsMin ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {meetsMin ? 'Eligible' : 'Locked'}
                        </div>

                        <div className="p-5 flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                            meetsMin ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            <Ticket size={24} strokeWidth={2.5} />
                          </div>

                          <div className="flex-1 min-w-0 pr-12">
                            <h4 className={`text-lg font-black uppercase tracking-tighter leading-none ${
                              meetsMin ? 'text-gray-900' : 'text-slate-500'
                            }`}>{c.code}</h4>
                            
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                meetsMin ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                              </span>
                              {c.minOrderAmount > 0 && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min. ₹{c.minOrderAmount}</span>
                              )}
                            </div>
                            
                            {!meetsMin && (
                              <div className="mt-3 flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-sky-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (cartTotal / c.minOrderAmount) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest shrink-0">Add ₹{Math.round(stillNeeds)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!meetsMin) {
                              toast.info(`Add ₹${Math.round(stillNeeds)} more to use this coupon!`);
                              return;
                            }
                            setCouponInput(c.code);
                            setOpenCouponDrawer(false);
                            // Auto-apply logic
                            const discountValue = c.discountType === 'percentage'
                              ? Math.round(cartTotal * (c.discountValue / 100))
                              : c.discountValue;
                            setAppliedCoupon(c);
                            setLocalDiscount(discountValue);
                            toast.success(`Coupon "${c.code}" applied!`);
                          }}
                          className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-t ${
                            meetsMin
                              ? 'bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border-sky-100'
                              : 'bg-white text-slate-300 cursor-not-allowed border-slate-100'
                          }`}
                        >
                          {meetsMin ? 'Apply Coupon Now' : `Need ₹${Math.round(stillNeeds)} more`}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        );
      })()}
      {/* QR Payment Modal for B2C */}
      {showQRModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-200 flex flex-col relative overflow-hidden text-center">
              <div className="mb-8">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Scan to Pay</h3>
                 <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">Order Amount: ₹{finalTotal}</p>
              </div>

              <div className="aspect-square bg-slate-50 rounded-[32px] border-4 border-slate-100 flex items-center justify-center mb-8 p-6 relative group">
                 {activeShop.bankDetails?.upiId ? (
                   <img 
                     src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${activeShop.bankDetails.upiId}&pn=${activeShop.name.replace(/[^a-zA-Z0-9 ]/g, "")}&am=${finalTotal}&cu=INR&tn=Store_Order_${(activeShop.name || 'Shop').slice(0, 10)}`)}`} 
                     alt="QR Code" 
                     className="w-full h-full object-contain relative z-10"
                   />
                 ) : (
                   <div className="text-center p-4">
                     <XCircle size={40} className="mx-auto text-rose-400 mb-2" />
                     <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Shop UPI ID Missing</p>
                     <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Please use another payment method</p>
                   </div>
                 )}
              </div>

              <div className="space-y-6">
                 <div className="relative">
                    <input 
                      type="file" 
                      id="b2c-proof-upload" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => setPaymentProofFile(e.target.files[0])} 
                    />
                    <label 
                      htmlFor="b2c-proof-upload"
                      className={`w-full py-5 rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${paymentProofFile ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-sky-300'}`}
                    >
                       {paymentProofFile ? (
                         <>
                           <CheckCircle2 size={24} />
                           <span className="text-[9px] font-black uppercase truncate px-4">{paymentProofFile.name}</span>
                         </>
                       ) : (
                         <>
                           <Upload size={24} />
                           <span className="text-[9px] font-black uppercase">Upload Payment Screenshot</span>
                         </>
                       )}
                    </label>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowQRModal(false)}
                      className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                    >Cancel</button>
                    <button 
                      type="button"
                      onClick={async () => {
                        if (!paymentProofFile) return toast.error("Please upload payment screenshot");
                        setIsUploadingProof(true);
                        try {
                          const pData = new FormData();
                          pData.append('image', paymentProofFile);
                          const { data } = await api.post('/upload/image', pData, { headers: { 'Content-Type': 'multipart/form-data' } });
                          setConfirmedPayment({ amount: finalTotal, proofUrl: data.url });
                          setShowQRModal(false);
                          toast.success("Payment verified! Finalize your order below.");
                        } catch (err) {
                          toast.error("Failed to upload proof");
                        } finally {
                          setIsUploadingProof(false);
                        }
                      }}
                      disabled={isUploadingProof || !paymentProofFile}
                      className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                       {isUploadingProof ? <Loader2 className="animate-spin mx-auto" /> : 'I have Paid & Uploaded'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Checkout;
