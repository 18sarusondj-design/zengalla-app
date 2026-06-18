import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../../shop/context/StoreContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft as ArrowLeftIcon, Plus as PlusIcon, Minus as MinusIcon, Trash2 as Trash2Icon, 
  Search as SearchIcon, CreditCard as CreditCardIcon, Wallet as WalletIcon, 
  Receipt as ReceiptIcon, User as UserIcon, Phone as PhoneIcon, 
  MessageCircle as MessageCircleIcon, Scan as ScanIcon, X as XIcon, 
  Camera as CameraIcon, AlertCircle as AlertCircleIcon, 
  CheckCircle2 as CheckCircle2Icon, Play as PlayIcon, Square as SquareIcon, 
  RotateCcw as RotateCcwIcon, Loader2 as Loader2Icon, 
  MessageSquare as MessageSquareIcon, TrendingUp as TrendingUpIcon, 
  Eye as EyeIcon, Download as DownloadIcon, Printer as PrinterIcon, 
  Zap as ZapIcon, Mail as MailIcon, Save as SaveIcon, Shield as ShieldIcon, 
  ChevronUp as ChevronUpIcon, ChevronDown as ChevronDownIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  ShoppingBag as ShoppingBagIcon, Scale as ScaleIcon, Banknote as BanknoteIcon 
} from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import ReceiptTemplate from '../components/ReceiptTemplate';
import ProfessionalInvoicing from '../components/ProfessionalInvoicing';
import api from '../../../config/api.js';

const Billing = () => {
  const { products, createBill, vendorShop, fetchVendorShop, updateShop, fetchData } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // State
  const [billItems, setBillItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', type: 'Retailer' });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBill, setProcessedBill] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isPhoneLocked, setIsPhoneLocked] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [partialPaidAmount, setPartialPaidAmount] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isB2BOrCredit, setIsB2BOrCredit] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState(null);
  const [weightInputMode, setWeightInputMode] = useState('weight'); // 'weight' or 'amount'
  const [weightUnit, setWeightUnit] = useState('KG'); // 'KG' or 'GM'
  const [weightInputValue, setWeightInputValue] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef(null);

  const [viewMode, setViewMode] = useState('GRID');
  const [sheetPage, setSheetPage] = useState(1);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const rowRefs = useRef([]);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setViewMode('SHEET');
    } else {
      setViewMode('GRID');
    }
  }, []);

  useEffect(() => {
    setSheetPage(1);
    setFocusedRowIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (viewMode === 'SHEET' && rowRefs.current[focusedRowIndex]) {
      rowRefs.current[focusedRowIndex].focus();
    }
  }, [focusedRowIndex, viewMode]);

  const receiptRef = useRef();

  // Load shop and data
  useEffect(() => {
    if (!vendorShop) fetchVendorShop();
    fetchData();
  }, [token, vendorShop, fetchVendorShop, fetchData]);

  const totalAmount = useMemo(() => {
    return billItems.reduce((sum, item) => {
      if (item.selectedWeight) return sum + (item.price * item.selectedWeight);
      return sum + (item.price * item.quantity);
    }, 0);
  }, [billItems]);

  const addToBill = (product, weight = null) => {
    setBillItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: weight ? 1 : item.quantity + 1, selectedWeight: weight || item.selectedWeight } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedWeight: weight }];
    });
    setBarcodeMode(false);
  };

  // Handle scanned barcodes redirect / broadcast
  useEffect(() => {
    const handleAutoAdd = (barcodeToSearch) => {
      if (!barcodeToSearch) return;
      const product = (products || []).find(p => p.barcode === barcodeToSearch);
      if (product) {
        // Stock check
        const currentStock = parseFloat(Number(product.stockQuantity || product.stock || 0));
        if (currentStock <= 0) {
          toast.error(`${product.name} is out of stock`);
          return;
        }
        if (product.sellingType === 'weight' || product.selling_type === 'weight') {
          setSelectedWeightProduct(product);
          setShowWeightModal(true);
        } else {
          addToBill(product);
          toast.success(`Added ${product.name} to bill`);
        }
      }
    };

    // 1. Check if we just navigated with autoAddBarcode in state
    if (location.state?.autoAddBarcode) {
      const barcode = location.state.autoAddBarcode;
      // Clear location state immediately to avoid double additions on reload/rerender
      navigate(location.pathname, { replace: true, state: {} });
      handleAutoAdd(barcode);
    }

    // 2. Listen to custom window scan event
    const handleGlobalScanEvent = (e) => {
      if (e.detail) {
        handleAutoAdd(e.detail);
      }
    };

    window.addEventListener('auto-add-billing-product', handleGlobalScanEvent);
    return () => {
      window.removeEventListener('auto-add-billing-product', handleGlobalScanEvent);
    };
  }, [location.state, products, navigate, location.pathname, addToBill]);

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      if (product.sellingType === 'weight' || product.selling_type === 'weight') {
        setSelectedWeightProduct(product);
        setShowWeightModal(true);
      } else {
        addToBill(product);
      }
      setBarcodeInput('');
      toast.success(`Added ${product.name}`);
    } else {
      toast.error('Product not found');
    }
  };

  const removeFromBill = (productId) => {
    setBillItems(prev => prev.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setBillItems(prev => prev.map(item => {
      if (item._id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handlePhoneLookup = async (phone) => {
    if (phone.length !== 10) return;
    try {
      const { data } = await api.get(`/auth/lookup?phone=${phone}`);
      if (data) {
        setCustomerInfo({
          name: data.name,
          phone: data.phone,
          email: data.email || ''
        });
        setIsPhoneLocked(true);
        setIsRegistered(true);
        
        // Check if this looked-up user is a B2B or Credit Customer of this shop
        const normalize = (num) => num ? num.replace(/\D/g, '').slice(-10) : '';
        const targetPhone = normalize(phone);
        
        const isB2B = vendorShop?.b2bPartners?.some(p => normalize(p.phone) === targetPhone);
        const isCredit = vendorShop?.payLaterPartners?.some(p => normalize(p.phone) === targetPhone);
        setIsB2BOrCredit(isB2B || isCredit);
        
        toast.success(`Found registered customer: ${data.name}`);
      }
    } catch (err) {
      console.warn("Lookup failed:", err.message);
      // Not registered, but we can still bill them as a guest
      setIsRegistered(false);
      setIsB2BOrCredit(false);
    }
  };

  const handleSubmit = async () => {
    if (billItems.length === 0) {
      toast.error('Please add items to bill');
      return;
    }

    setIsProcessing(true);
    try {
      const billData = {
        shopId: vendorShop._id,
        items: billItems.map(item => ({
          product: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          weight: item.selectedWeight
        })),
        totalPrice: totalAmount,
        paymentMethod: isSplitPayment ? 'SPLIT' : paymentMethod,
        cashAmount: isSplitPayment ? cashAmount : (paymentMethod === 'CASH' ? totalAmount : (paymentMethod === 'PARTIAL' ? parseFloat(partialPaidAmount) || 0 : 0)),
        onlineAmount: isSplitPayment ? onlineAmount : ((paymentMethod === 'ONLINE' || paymentMethod === 'CARD') ? totalAmount : 0),
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        customerBusinessName: customerInfo.name,
        customerBusinessAddress: customerInfo.address,
        paymentStatus: (paymentMethod === 'CREDIT' || paymentMethod === 'PARTIAL') ? (paymentMethod === 'PARTIAL' ? 'PARTIAL' : 'CREDIT') : 'PAID',
        balanceDue: (paymentMethod === 'CREDIT' || paymentMethod === 'PARTIAL') ? (totalAmount - (paymentMethod === 'PARTIAL' ? parseFloat(partialPaidAmount) || 0 : 0)) : 0
      };

      const res = await createBill(billData);
      if (res.success) {
        setProcessedBill(res.bill);
        setShowReceipt(true);
        // FULL RESET of billing section
        setBillItems([]);
        setCustomerInfo({ name: '', phone: '', address: '', type: 'Retailer' });
        setIsPhoneLocked(false);
        setPaymentMethod('CASH');
        setAmountPaid('');
        setCashAmount(0);
        setOnlineAmount(0);
        setPartialPaidAmount('');
        setIsSplitPayment(false);
        setSearchTerm('');
        
        toast.success('Bill generated successfully');
      } else {
        toast.error(res.error || 'Failed to create bill');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bill_${processedBill?.invoiceNumber || 'receipt'}.pdf`);
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download receipt');
    }
  };

  const handleWhatsAppShare = () => {
    if (!processedBill) return;
    const phone = processedBill.phone?.replace(/\D/g, '');
    if (!phone) return toast.error('No phone number found');
    
    const message = `*Invoice from ${vendorShop?.name}*\n` +
      `Bill No: ${processedBill.invoiceNumber}\n` +
      `Total: ₹${processedBill.totalPrice}\n` +
      `View Bill Online: ${window.location.origin}/order-success/${processedBill._id}\n\n` +
      `Thank you for shopping with us!`;
    
    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const query = searchTerm.toLowerCase().trim();
    
    const matched = products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    );
    
    return matched.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact match
      if (aName === query && bName !== query) return -1;
      if (bName === query && aName !== query) return 1;
      
      // Name starts with query
      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      // Word inside name starts with query
      const aWordStarts = aName.split(/\s+/).some(word => word.startsWith(query));
      const bWordStarts = bName.split(/\s+/).some(word => word.startsWith(query));
      if (aWordStarts && !bWordStarts) return -1;
      if (bWordStarts && !aWordStarts) return 1;
      
      // Keep alphabetical order otherwise
      return aName.localeCompare(bName);
    });
  }, [products, searchTerm]);

  const SHEET_ITEMS_PER_PAGE = 12;
  const paginatedFilteredProducts = useMemo(() => {
    return filteredProducts.slice((sheetPage - 1) * SHEET_ITEMS_PER_PAGE, sheetPage * SHEET_ITEMS_PER_PAGE);
  }, [filteredProducts, sheetPage]);

  const updateCartQuantity = (product, newQty) => {
    const stock = parseFloat(Number(product.stockQuantity || product.stock || 0).toFixed(3));
    if (newQty > stock) {
      toast.error(`Only ${stock} items available in stock`);
      newQty = stock;
    }
    
    setBillItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (newQty <= 0) {
        return prev.filter(item => item._id !== product._id);
      }
      if (existing) {
        return prev.map(item => 
          item._id === product._id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { ...product, quantity: newQty }];
    });
  };

  const handleTableKeyDown = (e, product, idx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.min(paginatedFilteredProducts.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (product.sellingType === 'weight' || product.selling_type === 'weight') {
        setSelectedWeightProduct(product);
        setShowWeightModal(true);
      } else {
        addToBill(product);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!(product.sellingType === 'weight' || product.selling_type === 'weight')) {
        const item = billItems.find(i => i._id === product._id);
        const currentQty = item ? item.quantity : 0;
        updateCartQuantity(product, currentQty + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (!(product.sellingType === 'weight' || product.selling_type === 'weight')) {
        const item = billItems.find(i => i._id === product._id);
        const currentQty = item ? item.quantity : 0;
        if (currentQty > 0) {
          updateCartQuantity(product, currentQty - 1);
        }
      }
    }
  };

  return (
    <div className="flex flex-col lg:h-screen min-h-screen bg-gray-50/50 p-2 lg:p-6 overflow-y-auto lg:overflow-hidden font-sans">
      {/* Header with Customer Info */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
            <ReceiptIcon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Billing Center</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{vendorShop?.name || 'Loading Shop...'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="CUSTOMER NAME" 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-sky-500/20"
              value={customerInfo.name}
              onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
            />
          </div>
          <div className="relative flex-1 md:w-48">
            <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="tel" 
              placeholder="MOBILE NUMBER" 
              className={`w-full border rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black outline-none tracking-widest ${isPhoneLocked ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-gray-50 border-gray-100'}`}
              value={customerInfo.phone}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setCustomerInfo({...customerInfo, phone: val});
                if (val.length === 10) handlePhoneLookup(val);
              }}
            />
            {isPhoneLocked && (
              <button 
                onClick={() => { setIsPhoneLocked(false); setCustomerInfo({ name: '', phone: '', address: '', type: 'Retailer' }); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-500 hover:bg-rose-50 p-1 rounded-lg"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 lg:overflow-hidden">
        {/* Product Selection */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-gray-100 lg:overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Barcode Scanner Toggle */}
              <button 
                onClick={() => { setBarcodeMode(!barcodeMode); if(!barcodeMode) setTimeout(() => barcodeRef.current?.focus(), 100); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${barcodeMode ? 'bg-rose-500 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
              >
                <ScanIcon size={16} /> {barcodeMode ? 'STOP SCAN' : 'BARCODE SCAN'}
              </button>

              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="SEARCH PRODUCTS..." 
                  className="w-full bg-gray-50 border border-transparent focus:border-sky-500 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* View Switcher Toggle */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 flex-shrink-0">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'GRID' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('SHEET')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'SHEET' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                Sheet View
              </button>
            </div>
          </div>

          {barcodeMode && (
            <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-100 animate-in slide-in-from-top duration-300">
               <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <input 
                    ref={barcodeRef}
                    type="text" 
                    placeholder="SCAN BARCODE NOW..." 
                    className="flex-1 bg-white border-2 border-rose-200 rounded-xl py-3 px-6 text-sm font-black tracking-[0.2em] outline-none focus:border-rose-500 transition-all uppercase"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="bg-rose-500 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-100">ADD</button>
               </form>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col">
            {viewMode === 'GRID' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3">
                {filteredProducts.map(p => {
                  const stock = parseFloat(Number(p.stockQuantity || p.stock || 0).toFixed(3));
                  const isOutOfStock = stock <= 0;
                  return (
                    <div 
                      key={p._id} 
                      onClick={() => {
                         if(isOutOfStock) return toast.error("Out of Stock");
                         if (p.sellingType === 'weight' || p.selling_type === 'weight') {
                            setSelectedWeightProduct(p);
                            setShowWeightModal(true);
                         } else {
                            addToBill(p);
                         }
                      }}
                      className={`group bg-gray-50 rounded-2xl p-2 border border-transparent hover:border-sky-200 hover:bg-white hover:shadow-xl hover:shadow-sky-500/5 transition-all cursor-pointer flex flex-col h-full relative ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="aspect-square bg-white rounded-xl mb-2 overflow-hidden border border-gray-100/50 relative">
                        <img 
                          src={p.imageUrl || p.image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'} 
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          style={{
                            objectPosition: p.imageSettings?.[0]?.position || '50% 50%',
                            transform: `scale(${(p.imageSettings?.[0]?.zoom || 100) / 100})`,
                            transformOrigin: p.imageSettings?.[0]?.position || '50% 50%'
                          }}
                        />
                        <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[7px] font-black text-sky-600 shadow-sm border border-sky-100">
                          ₹{p.price}
                        </div>
                      </div>
                      <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-tight line-clamp-1 leading-none mb-1">{p.name}</h3>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-gray-400 uppercase">{p.unit || 'PKT'}</span>
                          <span className={`text-[8px] font-black ${stock < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>QTY: {stock}</span>
                        </div>
                        <div className="w-6 h-6 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                          <PlusIcon size={12} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[9px] font-black sticky top-0 z-10">
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">Barcode / SKU</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-center">Available Stock</th>
                        <th className="px-4 py-3 text-center">Quantity</th>
                        <th className="px-4 py-3 text-center">Add To Cart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFilteredProducts.map((p, idx) => {
                        const stock = parseFloat(Number(p.stockQuantity || p.stock || 0).toFixed(3));
                        const isOutOfStock = stock <= 0;
                        const cartItem = billItems.find(item => item._id === p._id);
                        const cartQty = cartItem ? cartItem.quantity : 0;
                        const isFocused = focusedRowIndex === idx;

                        return (
                          <tr
                            key={p._id}
                            ref={el => rowRefs.current[idx] = el}
                            tabIndex={0}
                            onKeyDown={e => handleTableKeyDown(e, p, idx)}
                            onFocus={() => setFocusedRowIndex(idx)}
                            className={`border-b border-slate-100 text-[10px] font-medium transition-colors outline-none ${
                              isFocused 
                                ? 'bg-sky-50/80 ring-1 ring-inset ring-sky-500/20' 
                                : 'even:bg-slate-50/30 hover:bg-slate-50/50'
                            } ${isOutOfStock ? 'opacity-60' : ''}`}
                          >
                            <td className="px-4 py-2.5 font-bold uppercase text-slate-800">
                              {p.name}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-400">
                              {p.barcode || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 uppercase font-semibold">
                              {p.category || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-sky-600">
                              ₹{p.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`font-bold ${stock < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {stock} {p.unit || 'PKT'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                              {p.sellingType === 'weight' || p.selling_type === 'weight' ? (
                                <div className="text-center text-slate-400 font-bold uppercase text-[8px]">
                                  Weight Mode
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => updateCartQuantity(p, cartQty - 1)}
                                    className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-colors"
                                  >
                                    <MinusIcon size={10} strokeWidth={3} />
                                  </button>
                                  <input
                                    type="number"
                                    value={cartQty || ''}
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 0;
                                      updateCartQuantity(p, val);
                                    }}
                                    placeholder="0"
                                    className="w-10 text-center border border-slate-200 rounded py-0.5 text-[10px] font-black outline-none focus:border-sky-500"
                                  />
                                  <button
                                    onClick={() => updateCartQuantity(p, cartQty + 1)}
                                    className="w-5 h-5 rounded bg-slate-100 hover:bg-sky-100 hover:text-sky-600 text-slate-500 flex items-center justify-center transition-colors"
                                  >
                                    <PlusIcon size={10} strokeWidth={3} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => {
                                  if (isOutOfStock) return toast.error("Out of Stock");
                                  if (p.sellingType === 'weight' || p.selling_type === 'weight') {
                                    setSelectedWeightProduct(p);
                                    setShowWeightModal(true);
                                  } else {
                                    addToBill(p);
                                    toast.success(`Added ${p.name}`);
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                  cartQty > 0 
                                    ? 'bg-emerald-500 text-white shadow-sm' 
                                    : 'bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white'
                                }`}
                              >
                                {cartQty > 0 ? 'Added' : 'Add'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedFilteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-bold uppercase">
                            No products found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {filteredProducts.length > SHEET_ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 bg-white mt-auto">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setSheetPage(prev => Math.max(1, prev - 1))}
                        disabled={sheetPage === 1}
                        className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSheetPage(prev => Math.min(Math.ceil(filteredProducts.length / SHEET_ITEMS_PER_PAGE), prev + 1))}
                        disabled={sheetPage === Math.ceil(filteredProducts.length / SHEET_ITEMS_PER_PAGE)}
                        className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Showing <span className="font-black">{(sheetPage - 1) * SHEET_ITEMS_PER_PAGE + 1}</span> to{' '}
                          <span className="font-black">
                            {Math.min(sheetPage * SHEET_ITEMS_PER_PAGE, filteredProducts.length)}
                          </span>{' '}
                          of <span className="font-black">{filteredProducts.length}</span> products
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => setSheetPage(prev => Math.max(1, prev - 1))}
                            disabled={sheetPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon size={16} />
                          </button>
                          {Array.from({ length: Math.ceil(filteredProducts.length / SHEET_ITEMS_PER_PAGE) }).map((_, i) => {
                            const pageNum = i + 1;
                            const totalPages = Math.ceil(filteredProducts.length / SHEET_ITEMS_PER_PAGE);
                            if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - sheetPage) <= 1) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setSheetPage(pageNum)}
                                  className={`relative inline-flex items-center px-3 py-1.5 text-xs font-black ring-1 ring-inset ring-slate-300 focus:z-20 focus:outline-offset-0 ${
                                    sheetPage === pageNum
                                      ? 'z-10 bg-sky-500 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500'
                                      : 'text-slate-900 hover:bg-slate-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                            if (pageNum === 2 || pageNum === totalPages - 1) {
                              return (
                                <span key={pageNum} className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                          <button
                            onClick={() => setSheetPage(prev => Math.min(Math.ceil(filteredProducts.length / SHEET_ITEMS_PER_PAGE), prev + 1))}
                            disabled={sheetPage === Math.ceil(filteredProducts.length / SHEET_ITEMS_PER_PAGE)}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon size={16} />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart / Invoice Summary */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-gray-100 lg:overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <ReceiptIcon size={18} className="text-sky-500" />
              <h2 className="text-[12px] font-black text-gray-900 uppercase tracking-widest">Cart Summary</h2>
            </div>
            <span className="bg-sky-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-sky-200">
              {billItems.length} Items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
            {billItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400">
                  <ShoppingBagIcon size={32} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">Cart is Empty</p>
              </div>
            ) : (
              billItems.map(item => {
                const isSheet = viewMode === 'SHEET';
                return (
                  <div 
                    key={item._id} 
                    className={`flex items-center justify-between border transition-all ${
                      isSheet 
                        ? 'bg-slate-50/40 rounded-xl py-2 px-3 gap-2 border-slate-100 hover:bg-white hover:shadow-sm' 
                        : 'bg-gray-50/50 rounded-2xl p-4 gap-4 border-transparent hover:bg-white hover:shadow-md'
                    }`}
                  >
                    {!isSheet && (
                      <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                        <img 
                          src={item.imageUrl || item.image || (item.images && item.images[0])} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          style={{
                            objectPosition: item.imageSettings?.[0]?.position || '50% 50%',
                            transform: `scale(${(item.imageSettings?.[0]?.zoom || 100) / 100})`,
                            transformOrigin: item.imageSettings?.[0]?.position || '50% 50%'
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate leading-none">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-black text-sky-600 leading-none">
                          ₹{item.price}
                        </span>
                        {item.selectedWeight && (
                          <span className="text-[8px] font-bold text-slate-400 leading-none">
                            / {item.selectedWeight}KG
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.selectedWeight ? (
                        <button 
                          onClick={() => {
                            setSelectedWeightProduct(item);
                            setWeightInputValue(item.selectedWeight.toString());
                            setWeightUnit('KG');
                            setWeightInputMode('weight');
                            setShowWeightModal(true);
                          }}
                          className={`bg-white border border-gray-100 text-sky-500 hover:bg-sky-55 transition-all flex items-center justify-center shadow-sm ${
                            isSheet ? 'w-6 h-6 rounded-lg' : 'w-10 h-10 rounded-xl'
                          }`}
                        >
                          <EyeIcon size={isSheet ? 12 : 16} strokeWidth={3} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg shadow-sm border border-gray-100">
                          <button 
                            onClick={() => updateQuantity(item._id, -1)} 
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                          >
                            <MinusIcon size={10} strokeWidth={3} />
                          </button>
                          <span className="text-[10px] font-black w-5 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item._id, 1)} 
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-sky-500 transition-colors"
                          >
                            <PlusIcon size={10} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => removeFromBill(item._id)} 
                        className="text-gray-300 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2Icon size={isSheet ? 14 : 16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-gray-50/50 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
              <span className="text-xl font-black text-gray-900 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button 
                onClick={() => { setPaymentMethod('CASH'); setIsSplitPayment(false); }}
                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'CASH' && !isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-md' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Cash
              </button>
              <button 
                onClick={() => { setPaymentMethod('CARD'); setIsSplitPayment(false); }}
                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'CARD' && !isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-md' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Card
              </button>
              <button 
                onClick={() => { setPaymentMethod('ONLINE'); setIsSplitPayment(false); }}
                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'ONLINE' && !isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-md' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Online
              </button>
              <button 
                onClick={() => { setPaymentMethod('CREDIT'); setIsSplitPayment(false); }}
                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'CREDIT' && !isSplitPayment ? 'bg-rose-500 border-rose-400 text-white shadow-md' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Pay Later
              </button>
              {isB2BOrCredit && (
                <button 
                  onClick={() => { setPaymentMethod('PARTIAL'); setIsSplitPayment(false); }}
                  className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'PARTIAL' && !isSplitPayment ? 'bg-amber-500 border-amber-400 text-white shadow-md' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
                >
                  Partial
                </button>
              )}
              <button 
                onClick={() => setIsSplitPayment(true)}
                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-md' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Split
              </button>
            </div>

            {paymentMethod === 'PARTIAL' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 space-y-2 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Partial Payment Details</span>
                  <span className="text-[9px] font-black text-gray-400 uppercase">Balance: ₹{(totalAmount - (parseFloat(partialPaidAmount) || 0)).toFixed(2)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-black text-xs">₹</span>
                  <input 
                    type="number" 
                    placeholder="AMOUNT PAID NOW" 
                    className="w-full bg-white border border-amber-200 rounded-lg py-1.5 pl-7 pr-3 text-[10px] font-black outline-none focus:border-amber-500 transition-all"
                    value={partialPaidAmount}
                    onChange={e => setPartialPaidAmount(e.target.value)}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'ONLINE' && (
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-2 flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-sky-500 shadow-sm border border-sky-100">
                  <CheckCircle2Icon size={14} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">Online Method Selected</p>
                  <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tight italic">Scan QR on the printed bill to pay</p>
                </div>
              </div>
            )}

            {isSplitPayment && (
              <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                <input 
                  type="number" 
                  placeholder="CASH" 
                  className="bg-white border border-sky-100 rounded-lg p-1.5 text-[10px] font-black outline-none focus:border-sky-500"
                  value={cashAmount}
                  onChange={e => { setCashAmount(Number(e.target.value)); setOnlineAmount(totalAmount - Number(e.target.value)); }}
                />
                <input 
                  type="number" 
                  placeholder="ONLINE" 
                  className="bg-white border border-sky-100 rounded-lg p-1.5 text-[10px] font-black outline-none focus:border-sky-500"
                  value={onlineAmount}
                  readOnly
                />
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={isProcessing || billItems.length === 0 || !customerInfo.phone || customerInfo.phone.length !== 10}
              className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-md hover:bg-black hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2Icon size={14} className="animate-spin" /> : <CheckCircle2Icon size={14} />}
              Generate Invoice
            </button>
          </div>
        </div>
      </div>

      {showWeightModal && selectedWeightProduct && (() => {
        const pricePerKg = selectedWeightProduct.price;
        let totalPayable = 0;
        let calculatedWeight = 0;

        if (weightInputMode === 'weight') {
          const val = parseFloat(weightInputValue) || 0;
          calculatedWeight = weightUnit === 'GM' ? val / 1000 : val;
          totalPayable = calculatedWeight * pricePerKg;
        } else {
          const val = parseFloat(weightInputValue) || 0;
          totalPayable = val;
          calculatedWeight = val / pricePerKg;
        }

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="mb-6">
                   <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Loose Item Selection</p>
                      <button onClick={() => setShowWeightModal(false)} className="text-gray-300 hover:text-rose-500 transition-all p-1 bg-gray-50 rounded-full"><XIcon size={16} strokeWidth={3} /></button>
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{selectedWeightProduct.name}</h2>
                   <p className="text-[11px] font-bold text-slate-400 italic">₹{pricePerKg} per KG</p>
                </div>

                {/* Mode Tabs */}
                <div className="bg-gray-50 p-1.5 rounded-2xl flex gap-2 mb-6">
                   <button 
                     onClick={() => setWeightInputMode('weight')}
                     className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${weightInputMode === 'weight' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                      <ScaleIcon size={14} /> By Weight
                   </button>
                   <button 
                     onClick={() => setWeightInputMode('amount')}
                     className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${weightInputMode === 'amount' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                      <BanknoteIcon size={14} /> By Amount (₹)
                   </button>
                </div>

                {/* Input Area */}
                <div className="relative mb-6">
                   <p className="absolute -top-2 left-6 bg-white px-2 text-[9px] font-black text-gray-300 uppercase tracking-widest z-10">Enter</p>
                   <div className="bg-white border-2 border-sky-400/30 rounded-[32px] p-6 flex items-center justify-between group focus-within:border-sky-500 transition-all shadow-inner">
                      <div className="flex-1">
                        <input 
                          type="number" 
                          placeholder="0"
                          autoFocus
                          min="0"
                          className="w-full bg-transparent border-none outline-none focus:ring-0 focus:outline-none no-spinner text-5xl font-black text-slate-900 placeholder:text-slate-100 p-0"
                          value={weightInputValue}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) setWeightInputValue(val);
                          }}
                        />
                      </div>
                      
                      {weightInputMode === 'weight' ? (
                        <div className="flex flex-col gap-2">
                           <button 
                             onClick={() => setWeightUnit('KG')}
                             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${weightUnit === 'KG' ? 'bg-gray-200 text-gray-600' : 'bg-transparent text-gray-300 hover:bg-gray-50'}`}
                           >KG</button>
                           <button 
                             onClick={() => setWeightUnit('GM')}
                             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${weightUnit === 'GM' ? 'bg-sky-600 text-white shadow-lg' : 'bg-transparent text-gray-300 hover:bg-gray-50'}`}
                           >GM</button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 font-black">₹</div>
                      )}
                   </div>
                </div>

                {/* Summary */}
                <div className="bg-sky-50/50 rounded-3xl p-6 border border-sky-100/50 mb-8 text-center">
                   <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-1">Total Payable</p>
                   <p className="text-4xl font-black text-sky-600 tracking-tighter">₹{totalPayable.toFixed(2)}</p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => setShowWeightModal(false)}
                     className="py-5 bg-gray-50 text-gray-400 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all"
                   >
                      Cancel
                   </button>
                   <button 
                     onClick={() => {
                        if (calculatedWeight > 0) {
                          addToBill(selectedWeightProduct, calculatedWeight);
                          setShowWeightModal(false);
                          setWeightInputValue('');
                        }
                     }}
                     className="py-5 bg-[#0a0f1d] text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                   >
                      <ShoppingBagIcon size={16} /> Add to Cart
                   </button>
                </div>
             </div>
          </div>
        );
      })()}

      {/* Receipt Modal */}
      {showReceipt && processedBill && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300 no-print p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
               <div>
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Invoice Generated</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill No: {processedBill.invoiceNumber}</p>
               </div>
               <button 
                 onClick={() => setShowReceipt(false)}
                 className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
               >
                 <XIcon size={20} />
               </button>
            </div>

            {/* Success Message Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
               <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-emerald-200 mb-6 animate-scale-in">
                 <CheckCircle2Icon size={48} strokeWidth={2.5} />
               </div>
               <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Invoice Ready!</h2>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">The bill has been successfully generated and saved.</p>
            </div>

            {/* Actions Footer */}
            <div className="p-6 bg-white border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
               <button 
                 onClick={handlePrint}
                 className="flex flex-col items-center justify-center gap-2 p-4 bg-sky-50 text-sky-600 rounded-3xl hover:bg-sky-100 transition-all group"
               >
                 <PrinterIcon size={20} className="group-hover:scale-110 transition-transform" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Print</span>
               </button>
               <button 
                 onClick={handleDownloadPDF}
                 className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-3xl hover:bg-emerald-100 transition-all group"
               >
                 <DownloadIcon size={20} className="group-hover:scale-110 transition-transform" />
                 <span className="text-[8px] font-black uppercase tracking-widest">PDF</span>
               </button>
               <button 
                 onClick={handleWhatsAppShare}
                 className="flex flex-col items-center justify-center gap-2 p-4 bg-green-50 text-green-600 rounded-3xl hover:bg-green-100 transition-all group"
               >
                 <MessageCircleIcon size={20} className="group-hover:scale-110 transition-transform" />
                 <span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
               </button>
               <button 
                 onClick={() => setShowReceipt(false)}
                 className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-900 text-white rounded-3xl hover:bg-black transition-all group"
               >
                 <RotateCcwIcon size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                 <span className="text-[8px] font-black uppercase tracking-widest">New Bill</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF/Print Wrapper - Used for high quality capture */}
      <div className="fixed -left-[2000px] top-0 opacity-0 pointer-events-none">
        <div ref={receiptRef}>
          {processedBill && (
            processedBill.customerBusinessName ? (
              <ProfessionalInvoicing bill={processedBill} shop={vendorShop} />
            ) : (
              <ReceiptTemplate data={processedBill} shop={vendorShop} />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
