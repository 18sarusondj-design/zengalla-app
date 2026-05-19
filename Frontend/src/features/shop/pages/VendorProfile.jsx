import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../shop/context/StoreContext';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { Store, MapPin, Camera, Save, Loader2, Mail, Phone, Info, Navigation, Power, CheckCircle, XCircle, Smartphone, QrCode, Printer, Truck, Shield, Key, Award, Download, Eye, EyeOff, Clock, Users, Plus, Trash2, Sparkles, Share2, MessageSquare, ExternalLink, Gift, X, Wallet, CreditCard, Zap, Globe, Search } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import PWAInstallButton from '../../common/components/PWAInstallButton';


const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const LIBRARIES = ['places', 'geometry'];

import LeafletMap from '../../common/components/LeafletMap';

const formatOSMAddress = (data) => {
  if (!data || !data.address) return data?.display_name || '';
  
  const address = data.address;
  
  // 1. Get POI Name / Shop name / Map Name
  const poi = address.shop || 
              address.amenity || 
              address.building || 
              address.office || 
              address.tourism || 
              address.university || 
              address.school || 
              address.hospital || 
              address.historic ||
              address.leisure ||
              address.railway ||
              address.aeroway ||
              data.display_name.split(',')[0].trim();

  // 2. Get Area
  const area = address.suburb || 
               address.neighbourhood || 
               address.village || 
               address.town ||
               address.residential ||
               address.road ||
               '';

  // 3. Get Taluk / Sub-district
  const taluk = address.taluk || 
                address.subdistrict || 
                '';
                
  // 4. Get District / City
  const district = address.district || 
                   address.county || 
                   address.city || 
                   '';

  // 5. Get Pin Code
  const pincode = address.postcode ? address.postcode.split(' ')[0].replace(/\D/g, '').substring(0, 6) : '';

  // Build array of non-empty components
  const parts = [];
  
  // Add POI
  if (poi) parts.push(poi);
  
  // Add Area (if different from POI)
  if (area && area.toLowerCase() !== poi.toLowerCase()) parts.push(area);
  
  // Add Taluk (if different from POI and Area)
  if (taluk && taluk.toLowerCase() !== poi.toLowerCase() && taluk.toLowerCase() !== area.toLowerCase()) parts.push(taluk);
  
  // Add District (if different from POI, Area, and Taluk)
  if (district && 
      district.toLowerCase() !== poi.toLowerCase() && 
      district.toLowerCase() !== area.toLowerCase() && 
      district.toLowerCase() !== taluk.toLowerCase()) {
    parts.push(district);
  }

  // Add Pin Code at the very end
  if (pincode && pincode.length >= 5) parts.push(pincode);

  // Return a clean comma-separated string
  return parts.filter(Boolean).join(', ');
};

const VendorProfile = () => {
  const { user, token } = useAuth();
  const {
    orders, fetchOrders, getCustomers,
    toggleShopStatus, vendorShop, fetchVendorShop, updateShop, fetchData,
    loading: globalLoading
  } = useStore();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useQueryParam('tab', 'details');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [showSatellite, setShowSatellite] = useState(true);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isSendingCoupon, setIsSendingCoupon] = useState(false);
  const [isPaymentsUnlocked, setIsPaymentsUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [banners, setBanners] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountValue: '', discountType: 'percentage', minOrderAmount: 0, expiryDate: '', bannerId: '', usageLimit: '' });

  const shopUrl = `${window.location.protocol}//${window.location.host}/shop/${vendorShop?.id || vendorShop?._id || ''}`;

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    bannerUrl: '',
    phone: '',
    location: {
      address: '',
      coordinates: {
        lat: 15.3647,
        lng: 75.1240
      }
    },
    paymentQR: '',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    gstin: '',
    fssai: '',
    footerMessage: '',
    hasHomeDelivery: true,
    deliveryFee: 0,
    deliveryPricePerKm: 0,
    freeDeliveryThreshold: 500,
    platformFee: 0,
    vipRewardsEnabled: false,
    vipPointThreshold: 1000,
    vipPointValue: 10,
    staffAccessCode: '',
    staffPermissions: {
      canManageInventory: true,
      canViewCustomers: true
    },
    operatingHours: {
      enabled: false,
      start: '09:00',
      end: '21:00'
    },
    promoBanner: '',
    coupons: [],
    isWholesale: false,
    isPayLater: false,
    pinCode: '',
    areaName: '',
    storeCode: '',
    approvedB2BPhones: [],
    bankDetails: {
      upiId: '',
      bankName: '',
      accountNo: '',
      ifscCode: '',
      branch: ''
    }
  });

  const onLocationChange = async (coords, accuracy) => {
    const { lat, lng } = coords;

    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, coordinates: { lat, lng } },
      gpsAccuracy: accuracy || prev.gpsAccuracy
    }));

    const toastId = toast.loading('Detecting location details...');

    // Detect address and PIN code using Nominatim (OSM)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`);
      const data = await response.json();

      if (data) {
        const formattedAddress = formatOSMAddress(data);
        const pin = data.address?.postcode?.split(' ')[0].replace(/\D/g, '').substring(0, 6);

        setFormData(prev => ({
          ...prev,
          pinCode: pin || prev.pinCode,
          location: {
            ...prev.location,
            address: formattedAddress
          }
        }));

        if (pin) {
          // Fetch official Area Name from India Post
          try {
            const pinRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            const pinData = await pinRes.json();
            if (pinData?.[0]?.PostOffice?.[0]) {
              const detectedArea = pinData[0].PostOffice[0].District;
              const specificArea = pinData[0].PostOffice.find(po => formattedAddress.toUpperCase().includes(po.Name.toUpperCase()))?.Name;

              setFormData(prev => ({
                ...prev,
                areaName: (specificArea || detectedArea).toUpperCase()
              }));
              toast.success(`Location Synced: ${specificArea || detectedArea} (${pin})`, { id: toastId });
            } else {
              toast.success(`Location Synced: ${pin}`, { id: toastId });
            }
          } catch (pinErr) {
            toast.success(`Address Synced: ${pin}`, { id: toastId });
          }
        } else {
          toast.success('Address Updated!', { id: toastId });
        }
      } else {
        toast.error('Could not find address for this spot', { id: toastId });
      }
    } catch (error) {
      console.error('OSM error:', error);
      toast.error('Location service busy. Please try again.', { id: toastId });
    }
  };

  // -- Data Fetching --
  useEffect(() => {
    const loadInitialData = async () => {
      if (!token) return;

      if (fetchData) await fetchData();

      if (!vendorShop) {
        await fetchVendorShop();
      }

      try {
        const { data } = await api.get('/banners/my');
        if (data.success) {
          setBanners(data.banners || []);
        }
      } catch (err) {
        console.error("Failed to load vendor banners:", err);
      }

      const customerRes = await getCustomers();
      if (customerRes.success) setCustomers(customerRes.customers);
    };

    loadInitialData();
  }, [token]);

  useEffect(() => {
    // Only populate form if we have shop data AND the form name is still empty (initial load)
    // Or if we specifically want to sync (like after a successful update)
    if (vendorShop && !formData.name) {
      const coords = vendorShop.location?.coordinates;
      let lat = 15.3647;
      let lng = 75.1240;

      if (Array.isArray(coords)) {
        lng = coords[0];
        lat = coords[1];
      } else if (coords && typeof coords === 'object') {
        lat = coords.lat || lat;
        lng = coords.lng || lng;
      }

      setFormData(prev => ({
        ...prev,
        ...vendorShop,
        // Ensure identification fields are handled correctly
        gstin: vendorShop.gstin || '',
        fssai: vendorShop.fssai || '',
        pinCode: vendorShop.pinCode || '',
        areaName: vendorShop.areaName || '',
        // Fallback to user account info if shop info is missing
        name: vendorShop.name || prev.name || user?.name || '',
        phone: vendorShop.phone || prev.phone || user?.phone || '',
        coupons: vendorShop.coupons || prev.coupons || [],
        location: {
          address: vendorShop.address || vendorShop.location?.address || prev.location.address,
          coordinates: { lat, lng }
        }
      }));
    }
  }, [vendorShop, user]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Photo is too large! Please use an image smaller than 5MB.');
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading your shop photo...');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const { data: uploadData } = await api.post('/upload/image', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      if (!uploadData.url) throw new Error('Server did not return an image URL');

      const publicUrl = uploadData.url;
      const newFormData = { ...formData, imageUrl: publicUrl };
      setFormData(newFormData);

      const res = await updateShop(newFormData);
      if (res.success) {
        toast.success('Shop photo updated successfully!', { id: toastId });
      } else {
        toast.error(`Database sync failed: ${res.error}`, { id: toastId });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Unknown upload error';
      toast.error(`Upload failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUnlockPayments = async (e) => {
    e?.preventDefault();
    if (!unlockPassword) return;

    setIsUnlocking(true);
    try {
      const { data } = await api.post('/auth/verify-password', { password: unlockPassword });
      if (data.success) {
        setIsPaymentsUnlocked(true);
        toast.success('Payments Section Unlocked');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!vendorShop?._id) {
      toast.error("Shop data loading... please wait.");
      return;
    }
    setIsTogglingStatus(true);
    try {
      const res = await toggleShopStatus();
      if (!res.success) {
        toast.error(res.error || "Failed to toggle status");
      }
    } catch (err) {
      toast.error("Connection error. Please try again.");
      console.error('Toggle failed:', err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleUpdate = async (e, forceLabel) => {
    e?.preventDefault();
    
    // If called via form submit, the second arg is not provided. We determine it via activeTab.
    const label = forceLabel && typeof forceLabel === 'string' ? forceLabel : activeTab;

    if (!formData.name.trim()) {
      toast.error('Please enter a Shop Name first');
      return;
    }
    // Only enforce PIN code validation if we are in the location tab
    if (label === 'location' && (!formData.pinCode || formData.pinCode.length < 6)) {
      toast.error('Please enter a valid 6-digit PIN Code for your location');
      return;
    }
    if (formData.bankDetails?.upiId && !formData.bankDetails.upiId.includes('@')) {
      toast.error('Invalid UPI ID. It must contain "@" (e.g., name@okbank)');
      return;
    }
    try {
      setIsUpdating(true);
      // 1. UPI ID Validation (if provided)
      if (formData.bankDetails?.upiId) {
        const upiRegex = /^[\w.-]+@[\w.-]+$/;
        if (!upiRegex.test(formData.bankDetails.upiId)) {
          return toast.error("Please enter a valid UPI ID (e.g. name@upi)");
        }
      }

      let payload = {};

      if (label === 'details' || label === 'Details') {
        payload = {
          name: formData.name,
          phone: formData.phone,
          gstin: formData.gstin,
          fssai: formData.fssai,
          imageUrl: formData.imageUrl,
          bannerUrl: formData.bannerUrl
        };
      } else if (label === 'scheduling' || label === 'Schedule') {
        payload = { operatingHours: formData.operatingHours };
      } else if (label === 'location' || label === 'Location') {
        payload = {
          pinCode: formData.pinCode,
          areaName: formData.areaName,
          address: formData.location.address,
          location: {
            ...formData.location,
            type: 'Point',
            coordinates: [
              Number(formData.location.coordinates.lng || 75.1240),
              Number(formData.location.coordinates.lat || 15.3647)
            ]
          }
        };
      } else if (label === 'wholesale' || label === 'Wholesale Settings') {
        payload = { isWholesale: formData.isWholesale };
      } else if (label === 'credit' || label === 'Credit Settings') {
        payload = { isPayLater: formData.isPayLater };
      } else if (label === 'payments' || label === 'Payment Settings') {
        payload = { 
          bankDetails: formData.bankDetails,
          razorpayKeyId: formData.razorpayKeyId,
          razorpayKeySecret: formData.razorpayKeySecret
        };
      } else {
        // Fallback for any other updates like 'Profile'
        payload = { ...formData };
      }

      const res = await updateShop(payload);
      if (res.success) {
        toast.success(`${label} updated successfully!`);
        // Update local state with the returned shop to ensure consistency
        if (res.data) {
          setFormData(prev => ({ ...prev, ...res.data }));
        }
      } else {
        toast.error(res.error || "Update failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const shopName = formData.name || 'Your Shop';
    const shopId = vendorShop?.id || vendorShop?._id;
    const shopUrl = `${window.location.origin}/shop/${shopId || ''}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shopUrl)}`;

    try {
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text(shopName.toUpperCase(), 105, 25, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("OFFICIAL DIGITAL MENU & ORDERING", 105, 33, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SCAN TO START SHOPPING", 105, 60, { align: 'center' });

      const qrImage = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = qrUrl;
      });

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(2);
      doc.roundedRect(55, 75, 100, 100, 10, 10, 'S');
      doc.addImage(qrImage, 'PNG', 60, 80, 90, 90);

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`STORE ID: ${shopId}`, 105, 185, { align: 'center' });

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, 205, 150, 45, 8, 8, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("HOW TO ORDER:", 40, 218);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("1. Open the Store App or Website", 45, 226);
      doc.text("2. Tap the \"Scan & Shop\" tool on the home page", 45, 232);
      doc.text("3. Point your camera at this QR code", 45, 238);
      doc.text("4. Browse items, add to cart, and checkout instantly!", 45, 244);

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 277, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("POWERED BY SECURE PLATFORM", 105, 290, { align: 'center' });

      const safeName = shopName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeName}_Official_QR.pdf`);
      toast.success("Professional Flyer Downloaded!");
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
  };

  const SectionSaveButton = ({ label }) => (
    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
      <button
        type="submit" disabled={isUpdating}
        className={`h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 
          bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200 ring-2 ring-sky-50
        `}
      >
        {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save {label}</>}
      </button>
    </div>
  );

  const handlePlanUpdate = async (plan) => {
    setIsUpdating(true);
    try {
      await api.post('/monetization/select-plan', { plan });
      toast.success(`Plan updated to ${plan.toUpperCase()}! Please wait for admin verification.`);
      fetchVendorShop();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (globalLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-sky-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:h-screen md:overflow-hidden min-h-screen bg-slate-50 relative p-2 md:p-4">
      <div className="mb-4 flex-shrink-0 bg-white/60 backdrop-blur-sm sticky top-0 z-10 py-3 px-2 border-b border-sky-100 flex items-center justify-between rounded-t-[32px]">
        <div className="flex items-center gap-4">
          {/* Compact Branding Upside */}
          <div className="relative group shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-xl">
              {formData.imageUrl ? <img src={formData.imageUrl} alt="Shop" className="w-full h-full object-cover" /> : <Store size={24} className="m-auto mt-4 text-gray-300" />}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-600 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-lg hover:bg-sky-700 transition-all z-20 scale-90">
              <Camera size={10} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">{formData.name || 'Shop Profile'}</h1>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-600/10 text-sky-600 rounded-full border border-sky-600/20">
                <CheckCircle size={10} className="fill-sky-600 text-white" />
                <span className="text-[8px] font-black uppercase tracking-widest">Verified Vendor</span>
              </div>

              {vendorShop?.isSponsored && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20 animate-pulse">
                  <Sparkles size={10} className="fill-amber-500 text-white" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Sponsored Partner</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${vendorShop?.isActive ? 'bg-sky-50 text-sky-600' : 'bg-red-50 text-red-600'}`}>
          {vendorShop?.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
          <span className="text-[9px] font-black uppercase tracking-widest">{vendorShop?.isActive ? 'ACTIVE NODE' : 'INACTIVE NODE'}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 md:h-[calc(100vh-180px)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* LEFT SIDEBAR: Console & Status */}
          <div className="lg:col-span-1 flex flex-col md:h-full md:overflow-hidden">
            <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-2 border border-white shadow-xl flex flex-col space-y-1">
              <p className="px-4 py-0.5 text-[8px] font-black text-gray-600 uppercase tracking-widest border-b border-white/30 mb-0.5">Store Console</p>

              {/* PWA Install Trigger - TOP OF SIDEBAR */}
              <div className="px-1 py-1">
                <PWAInstallButton variant="sidebar" className="!bg-sky-500 !text-white !h-11 !rounded-2xl shadow-lg shadow-sky-100" />
              </div>


              {/* Quick Actions at the Top */}
              <div className="px-1 py-0.5 space-y-0.5 flex-shrink-0">
                <div
                  role="button"
                  onClick={handleToggleStatus}
                  className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${vendorShop?.isActive ? 'bg-sky-600/10 border-sky-600/20 shadow-sm shadow-sky-100' : 'bg-gray-100 border-gray-200'} ${isTogglingStatus ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg border transition-colors ${vendorShop?.isActive ? 'bg-sky-100 text-sky-600 border-sky-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                      {isTogglingStatus ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} strokeWidth={2.5} />}
                    </div>
                    <span className="font-black text-[9px] uppercase tracking-wider text-gray-700">Live Status</span>
                  </div>
                  <div
                    className={`relative w-10 min-w-[40px] h-5 rounded-full transition-all flex items-center px-1 ${vendorShop?.isActive ? 'bg-sky-500 justify-end shadow-lg shadow-sky-100' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${isTogglingStatus ? 'scale-75' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Navigation Menu - Compacted Further */}
              <div className="space-y-1 flex-1 pr-1 md:overflow-hidden overflow-y-auto custom-scrollbar-visible py-1">
                {[
                  { id: 'details', label: 'Store Details', icon: Info, color: '#0ea5e9' },
                  { id: 'scheduling', label: 'Scheduling', icon: Clock, color: '#0ea5e9' },
                  { id: 'location', label: 'Store Location', icon: MapPin, color: '#0ea5e9' },
                  { id: 'payments', label: 'Payments & QR', icon: QrCode, color: '#0ea5e9' },
                  { id: 'marketing', label: 'Coupons & Offers', icon: Award, color: '#0ea5e9' },
                  { id: 'credit', label: 'Credit Ledger', icon: Wallet, color: '#0ea5e9' },
                  { id: 'wholesale', label: 'B2B Wholesale', icon: Shield, color: '#0ea5e9' },
                  vendorShop?.isSponsored && { id: 'sponsorship', label: 'Sponsorship', icon: Sparkles, color: '#f59e0b' },
                ].filter(Boolean).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 p-1.5 rounded-xl transition-all duration-300 group ${isActive
                        ? `text-white scale-[1.02] shadow-lg`
                        : 'text-gray-500 hover:bg-white/60 hover:text-gray-900 border border-transparent'
                        }`}
                      style={isActive ? { backgroundColor: tab.color, boxShadow: `0 10px 15px -3px ${tab.color}33` } : {}}
                    >
                      <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white/20' : 'bg-gray-100/50 group-hover:bg-white'}`}>
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-wider">{tab.label}</span>
                    </button>
                  );
                })}
              </div>




            </div>
          </div>

          {/* RIGHT PANEL: Dynamic Content Forms */}
          <div className="lg:col-span-2 flex flex-col md:h-full md:overflow-hidden">
            <form onSubmit={handleUpdate} className="flex flex-col md:h-full">
              <div className="flex-1 md:overflow-y-auto custom-scrollbar-visible bg-white/60 backdrop-blur-md rounded-[40px] shadow-2xl border border-white/50 p-5 overflow-y-auto">

                {activeTab === 'details' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Shop Name</label>
                        <input
                          type="text" required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-2xl p-4 text-xs font-bold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Phone Number</label>
                        <input
                          type="tel" maxLength="10"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">GSTIN (Optional)</label>
                        <input
                          type="text" placeholder="29AAAAA0000A1Z5"
                          value={formData.gstin}
                          onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                          className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">FSSAI Number (Optional)</label>
                        <input
                          type="text" placeholder="12345678901234"
                          value={formData.fssai}
                          onChange={(e) => setFormData({ ...formData, fssai: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <SectionSaveButton label="Details" />
                  </div>
                )}

                {activeTab === 'scheduling' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-center justify-between p-4 bg-emerald-50/40 rounded-[28px] border-2 border-emerald-100/50 transition-all hover:bg-emerald-50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-2xl transition-all ${formData.operatingHours.enabled ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
                          <Clock size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Auto-Scheduling</h4>
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{formData.operatingHours.enabled ? 'Automatic Online/Offline Active' : 'Manual Status Only'}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-110">
                        <input
                          type="checkbox" className="sr-only peer"
                          checked={formData.operatingHours.enabled}
                          onChange={(e) => setFormData({ ...formData, operatingHours: { ...formData.operatingHours, enabled: e.target.checked } })}
                        />
                        <div className="w-12 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="bg-white/80 border-2 border-sky-50 rounded-3xl p-6 space-y-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Set your trading window (24h Format)</p>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Opening Time</label>
                          <input
                            type="time"
                            value={formData.operatingHours.start}
                            onChange={(e) => setFormData({ ...formData, operatingHours: { ...formData.operatingHours, start: e.target.value } })}
                            className="w-full bg-sky-50/50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl p-4 text-sm font-black text-gray-800 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Closing Time</label>
                          <input
                            type="time"
                            value={formData.operatingHours.end}
                            onChange={(e) => setFormData({ ...formData, operatingHours: { ...formData.operatingHours, end: e.target.value } })}
                            className="w-full bg-sky-50/50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl p-4 text-sm font-black text-gray-800 transition-all outline-none"
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-3 items-start">
                        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
                          The system detects time in Indian Standard Time (IST). If enabled, your shop will go "Offline" automatically exactly at closing time. You can still manually switch offline any time from the sidebar.
                        </p>
                      </div>
                    </div>
                    <SectionSaveButton label="Schedule" />
                  </div>
                )}


                {/* Delivery & Services section removed - managed by Super Admin */}

                {activeTab === 'location' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 h-full flex flex-col">
                    <div className="relative group h-64 rounded-[32px] overflow-hidden border-2 border-blue-50 shadow-xl bg-gray-50 flex items-center justify-center">
                      <div className="w-full h-full relative cursor-pointer" onClick={() => setIsMapModalOpen(true)}>
                        <LeafletMap
                          height="100%"
                          userCoords={formData.location?.coordinates}
                          zoom={15}
                          autoDetect={false}
                          interactive={false}
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px] pointer-events-none z-[1000]">
                          <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                            <Navigation className="text-blue-500 animate-bounce" size={18} />
                            <span className="font-black text-[10px] uppercase tracking-widest text-gray-800">Tap to Adjust Point</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">PIN Code</label>
                        <input
                          type="text" maxLength="6" placeholder="580020"
                          value={formData.pinCode}
                          onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="w-full bg-white/80 border-2 border-blue-50 focus:border-blue-400 rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Area Name</label>
                        <input
                          type="text" placeholder="DHARWAD"
                          value={formData.areaName}
                          onChange={(e) => setFormData({ ...formData, areaName: e.target.value.toUpperCase() })}
                          className="w-full bg-white/80 border-2 border-blue-50 focus:border-blue-400 rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Address Information</label>
                      <textarea
                        rows="2" value={formData.location.address}
                        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, address: e.target.value } })}
                        className="w-full bg-white/80 border-2 border-blue-50 focus:border-blue-400 rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none resize-none"
                      />
                    </div>
                    <SectionSaveButton label="Location" />
                  </div>
                )}

                {activeTab === 'wholesale' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-center justify-between p-6 bg-sky-50/40 rounded-[32px] border-2 border-sky-100/50 transition-all hover:bg-sky-50">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-all ${formData.isWholesale ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' : 'bg-gray-200 text-gray-400'}`}>
                          <Store size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 uppercase tracking-tight text-lg">Wholesale Mode</h4>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mt-1">
                            {formData.isWholesale ? 'B2B Pricing Engine: Active' : 'B2B Pricing Engine: Standby'}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-125">
                        <input
                          type="checkbox" className="sr-only peer"
                          checked={formData.isWholesale}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setFormData({ ...formData, isWholesale: val });
                            toast.info(`Wholesale mode ${val ? 'enabled' : 'disabled'}. Click "Update Profile" to save.`);
                          }}
                        />
                        <div className="w-12 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                      </label>
                    </div>

                    <div className="bg-white/80 border-2 border-sky-50 rounded-[40px] p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Users size={32} />
                      </div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight text-base">Partner Whitelist Management</h4>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight leading-relaxed max-w-xs mx-auto">
                        Management of whitelisted B2B phone numbers, emails, and GSTINs has been moved to the <span className="text-sky-600">sidebar menu</span> for better accessibility.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/vendor/dashboard/b2b')}
                        className="px-6 py-3 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-700 transition-all active:scale-95 shadow-lg shadow-sky-100"
                      >
                        Manage B2B Partners
                      </button>

                    </div>
                    <SectionSaveButton label="Wholesale Settings" />
                  </div>
                )}

                {activeTab === 'credit' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-center justify-between p-6 bg-sky-50/40 rounded-[32px] border-2 border-sky-100/50 transition-all hover:bg-sky-50">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-all ${formData.isPayLater ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-gray-200 text-gray-400'}`}>
                          <Wallet size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 uppercase tracking-tight text-lg">Credit System</h4>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mt-1">
                            {formData.isPayLater ? 'Customer Credit: Enabled' : 'Customer Credit: Standby'}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-125">
                        <input
                          type="checkbox" className="sr-only peer"
                          checked={formData.isPayLater}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setFormData({ ...formData, isPayLater: val });
                            toast.info(`Credit System ${val ? 'enabled' : 'disabled'}. Click "Update Profile" to save.`);
                          }}
                        />
                        <div className="w-12 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>

                    <div className="bg-white/80 border-2 border-sky-50 rounded-[40px] p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <CreditCard size={32} />
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/vendor/dashboard/credit-customers')}
                        className="px-8 py-4 bg-sky-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-sky-700 transition-all active:scale-95 shadow-xl shadow-sky-100 flex items-center justify-center mx-auto gap-3"
                      >
                        Open Credit Ledger
                      </button>
                    </div>
                    <SectionSaveButton label="Credit System" />
                  </div>
                )}

                {activeTab === 'payments' && (
                  !isPaymentsUnlocked ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 space-y-8 animate-in fade-in zoom-in duration-500">
                      <div className="w-24 h-24 bg-sky-50 text-sky-600 rounded-[40px] flex items-center justify-center shadow-xl shadow-sky-100/50">
                        <Shield size={48} strokeWidth={2.5} />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Security Lock</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed max-w-xs text-center mx-auto">Enter your account password to access <span className="text-sky-600">Payment Gateway</span> settings.</p>
                      </div>
                      <div className="w-full max-w-sm space-y-4">
                        <div className="relative group">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-sky-500 transition-colors" size={18} />
                          <input
                            type="password"
                            placeholder="Enter Password"
                            value={unlockPassword}
                            onChange={(e) => setUnlockPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlockPayments(e)}
                            className="w-full bg-white border-2 border-gray-100 focus:border-sky-400 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-800 transition-all outline-none shadow-sm"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleUnlockPayments}
                          disabled={isUnlocking}
                          className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isUnlocking ? <Loader2 className="animate-spin" size={18} /> : <><Power size={18} /> Unlock Section</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                      <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2">
                        <div className="flex items-center gap-3 text-emerald-700">
                          <Shield size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Section Unlocked</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPaymentsUnlocked(false);
                            setUnlockPassword('');
                          }}
                          className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline"
                        >
                          Lock Again
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Razorpay Key Id</label>
                          <input
                            type="text" placeholder="Enter Razorpay Key ID"
                            value={formData.razorpayKeyId || ''}
                            onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                            className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-xl p-3 text-[11px] font-bold text-gray-800 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Razorpay Secret</label>
                          <div className="relative">
                            <input
                              type={showSecret ? "text" : "password"}
                              placeholder={formData.hasRazorpaySecret ? "••••••••••••••••" : "Enter Razorpay Secret Key"}
                              value={formData.razorpayKeySecret}
                              onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
                              className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-xl p-3 pr-12 text-[11px] font-bold text-gray-800 transition-all outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-sky-600 transition-colors"
                            >
                              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {formData.hasRazorpaySecret && !formData.razorpayKeySecret && (
                            <p className="text-[9px] font-bold text-emerald-600 ml-4 italic">✓ Your Secret Key is safely stored and secured.</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/80 border-2 border-sky-50 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">UPI Payment Configuration</h4>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">For live QR code generation</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">UPI ID (e.g. name@upi)</label>
                          <input
                            type="text" placeholder="example@okhdfcbank"
                            value={formData.bankDetails?.upiId || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              bankDetails: { ...formData.bankDetails, upiId: e.target.value }
                            })}
                            className="w-full bg-white border-2 border-sky-50 focus:border-sky-400 rounded-xl p-4 text-[11px] font-bold text-gray-800 transition-all outline-none"
                          />
                          <p className="text-[8px] font-bold text-sky-500 ml-4 uppercase tracking-tighter">This ID will be encoded into dynamic QR codes for your B2B customers.</p>
                        </div>
                      </div>

                      <div className="relative group overflow-hidden rounded-[32px] bg-gradient-to-br from-sky-500 to-sky-600 p-4 text-center text-white shadow-2xl">
                        <div className="inline-block p-2 bg-white rounded-[24px] shadow-2xl mb-3">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/shop/${vendorShop?.id || vendorShop?._id || ''}`)}`}
                            alt="Shop QR" className="w-20 h-20"
                          />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter leading-tight">Instant Checkout Terminal</h3>
                        <p className="text-white/80 font-bold text-[8px] uppercase tracking-widest mt-1 px-10 italic leading-none">Scan this code to place orders directly at {formData.name}</p>

                        <button
                          type="button" onClick={handleDownloadPDF}
                          className="mt-4 flex items-center justify-center mx-auto gap-2 px-6 py-2.5 bg-white text-sky-600 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-sky-50 transition-all active:scale-95 shadow-xl disabled:opacity-50"
                        >
                          <Download size={12} /> Download Flyer
                        </button>
                      </div>
                      <SectionSaveButton label="Payment Settings" />
                    </div>
                  )
                )}


                {activeTab === 'marketing' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">


                    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Active Coupons</h3>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Manage your discount codes</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCouponForm(!showCouponForm)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
                        >
                          {showCouponForm ? <XCircle size={14} /> : <Plus size={14} />} {showCouponForm ? 'Cancel' : 'Add Coupon'}
                        </button>
                      </div>

                      {showCouponForm && (
                        <div className="bg-sky-50/50 border-2 border-sky-100 rounded-2xl p-4 mb-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Coupon Code</label>
                              <div className="relative">
                                <input
                                  type="text" placeholder="Coupon Code"
                                  value={newCoupon.code}
                                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                  className="w-full bg-white border border-sky-100 rounded-xl p-3 pr-10 text-[10px] font-bold outline-none focus:border-sky-400 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const prefixes = ['SAVE', 'GET', 'OFFER', 'PROMO', 'SHOP'];
                                    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                                    const randomNumber = Math.floor(10 + Math.random() * 90); // 10-99
                                    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
                                    setNewCoupon({ ...newCoupon, code: `${randomPrefix}${randomNumber}${randomSuffix}` });
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                  title="Auto-generate code"
                                >
                                  <Sparkles size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Discount Value</label>
                              <input
                                type="number" placeholder="20" min="0"
                                value={newCoupon.discountValue}
                                onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-sky-400 transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Expiry Date (Optional)</label>
                              <input
                                type="date"
                                value={newCoupon.expiryDate}
                                onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-sky-400 transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Min. Order Amount (₹)</label>
                              <input
                                type="number" placeholder="499" min="0"
                                value={newCoupon.minOrderAmount}
                                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Math.max(0, Number(e.target.value)) })}
                                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-sky-400 transition-all"
                              />
                            </div>
                            {vendorShop?.bannersEnabled && (
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Restrict to Banner (Optional)</label>
                                <select
                                  value={newCoupon.bannerId || ''}
                                  onChange={(e) => setNewCoupon({ ...newCoupon, bannerId: e.target.value || '' })}
                                  className="w-full bg-white border border-sky-100 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-sky-400 transition-all"
                                >
                                  <option value="">None (Applies to all products)</option>
                                  {banners.map(b => (
                                    <option key={b._id} value={b._id}>
                                      {b.title} ({b.type})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Usage Limit (Optional)</label>
                              <input
                                type="number" placeholder="e.g. 10 (Leave blank for unlimited)" min="0"
                                value={newCoupon.usageLimit}
                                onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: Math.max(0, Number(e.target.value)) || '' })}
                                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-sky-400 transition-all"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex bg-white p-1 rounded-xl border border-sky-100">
                              {['percentage', 'flat'].map((type) => (
                                <button
                                  key={type} type="button"
                                  onClick={() => setNewCoupon({ ...newCoupon, discountType: type })}
                                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newCoupon.discountType === type ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                  {type === 'percentage' ? '%' : '₹'}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newCoupon.code || !newCoupon.discountValue) return toast.error("Please fill all fields");
                                const val = Number(newCoupon.discountValue);
                                if (isNaN(val) || val <= 0) return toast.error("Please enter a valid discount value");

                                const updatedCoupons = [...(formData.coupons || []), {
                                  ...newCoupon,
                                  discountValue: val,
                                  minOrderAmount: Number(newCoupon.minOrderAmount) || 0,
                                  usageLimit: Number(newCoupon.usageLimit) || null,
                                  expiryDate: newCoupon.expiryDate || undefined,
                                  isActive: true
                                }];

                                // Update local state
                                setFormData(prev => ({
                                  ...prev,
                                  coupons: updatedCoupons
                                }));

                                // Clear form
                                setNewCoupon({ code: '', discountValue: '', discountType: 'percentage', minOrderAmount: 0, expiryDate: '', bannerId: '', usageLimit: '' });
                                setShowCouponForm(false);

                                // Persist to database
                                try {
                                  const payload = {
                                    ...formData,
                                    coupons: updatedCoupons,
                                    location: {
                                      ...formData.location,
                                      type: 'Point',
                                      coordinates: [
                                        Number(formData.location.coordinates.lng || 75.1240),
                                        Number(formData.location.coordinates.lat || 15.3647)
                                      ]
                                    },
                                    address: formData.location.address,
                                    pinCode: formData.pinCode
                                  };
                                  
                                  const res = await updateShop(payload);
                                  if (res.success) {
                                    toast.success("Coupon added and synced to your shop!");
                                  } else {
                                    toast.error("Failed to sync coupon to cloud.");
                                  }
                                } catch (err) {
                                  toast.error("Connection error. Could not save coupon.");
                                }
                              }}
                              className="px-6 py-2 bg-sky-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
                            >
                              Confirm Addition
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(formData.coupons || []).map((coupon, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-500 shadow-sm">
                                  <Award size={20} />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{coupon.code}</p>
                                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                    {coupon.minOrderAmount > 0 && <span className="text-gray-400 ml-2"> • Above ₹{coupon.minOrderAmount}</span>}
                                    {coupon.usageLimit && <span className="text-sky-500 ml-2"> • Limit: {coupon.usageLimit} uses</span>}
                                  </p>
                                  {coupon.bannerId && (
                                    <p className="text-[8px] font-black text-sky-500 uppercase tracking-widest mt-0.5">
                                      🎯 Banner Only: {banners.find(b => b._id === coupon.bannerId)?.title || 'Campaign'}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    toast.warning("Remove this coupon?", {
                                      action: {
                                        label: "Confirm Delete",
                                        onClick: async () => {
                                          const updatedCoupons = formData.coupons.filter((_, i) => i !== idx);
                                          
                                          // Update local state for immediate UI feedback
                                          setFormData(prev => ({
                                            ...prev,
                                            coupons: updatedCoupons
                                          }));

                                          // Immediately persist to database
                                          try {
                                            const payload = {
                                              ...formData,
                                              coupons: updatedCoupons,
                                              location: {
                                                ...formData.location,
                                                type: 'Point',
                                                coordinates: [
                                                  Number(formData.location.coordinates.lng || 75.1240),
                                                  Number(formData.location.coordinates.lat || 15.3647)
                                                ]
                                              },
                                              address: formData.location.address,
                                              pinCode: formData.pinCode
                                            };
                                            
                                            const res = await updateShop(payload);
                                            if (res.success) {
                                              toast.success("Coupon removed and synced!");
                                            } else {
                                              toast.error("Cloud sync failed. Changes may not persist.");
                                            }
                                          } catch (err) {
                                            toast.error("Connection error. Could not save deletion.");
                                          }
                                        }
                                      }
                                    });
                                  }}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-gray-100 shadow-sm"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {formData.coupons.length === 0 && (
                            <div className="col-span-full py-8 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No active coupons yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[32px] flex gap-4 items-start">
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0">
                        <Info size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-900 uppercase tracking-tight mb-1">Coupon Management Tip</p>
                        <p className="text-[11px] font-bold text-blue-700/70 leading-relaxed uppercase tracking-tight">
                          Adding specific coupon codes allows you to track marketing performance. Customers can find these in your shop banner or during checkout.
                        </p>
                      </div>
                    </div>
                    <SectionSaveButton label="Coupons & Offers" />
                  </div>
                )}

                {activeTab === 'sponsorship' && vendorShop?.isSponsored && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    {/* BOOST YOUR SALES SECTION */}
                    <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                        <Gift size={120} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight mb-1">Boost Your Sales</h3>
                      <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Create a shop-wide offer banner to attract customers.</p>

                      <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/70 uppercase tracking-widest ml-1">Offer Message (Max 40 Chars)</label>
                          <div className="relative">
                            <input
                              type="text"
                              maxLength="40"
                              placeholder="Reward Description"
                              value={formData.promoBanner}
                              onChange={(e) => setFormData({ ...formData, promoBanner: e.target.value })}
                              className="w-full bg-white text-gray-900 rounded-2xl p-4 pr-12 text-xs font-bold outline-none focus:ring-4 focus:ring-white/20 transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500">
                              <Sparkles size={18} />
                            </div>
                          </div>
                        </div>

                        {formData.promoBanner && (
                          <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-3">Live Preview on Store Page</p>
                            <div className="bg-rose-600/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                                  <Award size={20} />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-white uppercase tracking-tight">{formData.promoBanner}</p>
                                  <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Active Coupon: Apply at Checkout</p>
                                </div>
                              </div>
                              <button type="button" className="px-4 py-2 bg-white text-rose-500 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                Copy Code
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <SectionSaveButton label="Sponsorship Data" />
                  </div>
                )}
              </div>

            </form>
          </div>
        </div>
      </div>
      {/* MAP MODAL OVERLAY */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={() => setIsMapModalOpen(false)} />

          <div className="relative w-full max-w-5xl h-[80vh] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-scale-in">
            <div className="p-6 bg-white border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 flex-shrink-0">
              <div className="flex-1 flex flex-col md:flex-row items-center gap-6 w-full">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl shadow-inner">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tighter uppercase leading-none">Adjust Shop Location</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Satellite Precision Active</p>
                  </div>
                </div>

                {/* Modern Search Bar */}
                <div className="bg-gray-50 p-2 rounded-[24px] border border-gray-100 flex-1 w-full max-w-xl flex items-center gap-2 group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white transition-all">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-focus-within:text-blue-500 shadow-sm transition-colors">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search your street, area or landmark..."
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder:text-gray-300"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const query = e.target.value;
                        if (!query) return;
                        const toastId = toast.loading('Searching location...');
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en`);
                          const results = await res.json();
                          if (results && results.length > 0) {
                            const { lat, lon } = results[0];
                            onLocationChange({ lat: parseFloat(lat), lng: parseFloat(lon) });
                            toast.success('Location found!', { id: toastId });
                          } else {
                            toast.error('Location not found', { id: toastId });
                          }
                        } catch (err) {
                          toast.error('Search failed', { id: toastId });
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowSatellite(prev => !prev)}
                  className="px-6 h-12 bg-white text-gray-900 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl border border-gray-100 hover:bg-sky-50 transition-all flex-1 md:flex-none justify-center"
                >
                  {showSatellite ? 'Map View' : 'Satellite View'}
                </button>
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-rose-600 transition-all active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <LeafletMap
                height="100%"
                userCoords={formData.location?.coordinates}
                onUserLocationChange={onLocationChange}
                onLocationSelect={onLocationChange}
                showSatellite={showSatellite}
                zoom={19}
              />

              {/* Small Detect Location Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!navigator.geolocation) return toast.error("Geolocation not supported");
                  const tid = toast.loading("Detecting...");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      onLocationChange(
                        { lat: pos.coords.latitude, lng: pos.coords.longitude },
                        pos.coords.accuracy
                      );
                      toast.success("Located with high precision!", { id: tid });
                    },
                    (err) => {
                      toast.error("Enable GPS access", { id: tid });
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                  );
                }}
                className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-blue-600 hover:scale-110 active:scale-95 transition-all border border-gray-100"
                title="Locate Me"
              >
                <Navigation size={20} fill="currentColor" />
              </button>
            </div>

            <div className="p-6 bg-gray-50/50 flex items-center justify-between gap-6 flex-shrink-0">
              <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Selected Point</p>
                <p className="text-[11px] font-black text-blue-600 mt-1 truncate">
                  {(formData.location?.coordinates?.lat || 15.3647).toFixed(6)}, {(formData.location?.coordinates?.lng || 75.1240).toFixed(6)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  setIsMapModalOpen(false);
                  handleUpdate(e, 'Location');
                }}
                className="h-14 px-10 bg-blue-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                Finalize & Save Location
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Coupon Modal */}
    </div>
  );
};

export default VendorProfile;
