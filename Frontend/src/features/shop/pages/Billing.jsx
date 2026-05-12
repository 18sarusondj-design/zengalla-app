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
  ChevronUp as ChevronUpIcon, ChevronDown as ChevronDownIcon, 
  ShoppingBag as ShoppingBagIcon, Scale as ScaleIcon, Banknote as BanknoteIcon 
} from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import ReceiptTemplate from '../components/ReceiptTemplate';
import ProfessionalInvoicing from '../components/ProfessionalInvoicing';
import api from '../../../config/api.js';

const Billing = () => {
  const { products, createBill, vendorShop, fetchVendorShop, updateShop } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const receiptRef = useRef();

  // Load shop
  useEffect(() => {
    if (!vendorShop) fetchVendorShop();
  }, [vendorShop, fetchVendorShop]);

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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50/50 p-4 lg:p-6 overflow-hidden">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Product Selection */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
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
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredProducts.map(p => {
                const stock = Number(p.stockQuantity || p.stock || 0);
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
                        src={p.imageUrl || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'} 
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
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
          </div>
        </div>

        {/* Cart / Invoice Summary */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
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
              billItems.map(item => (
                <div key={item._id} className="bg-gray-50/50 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                  <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                    <img src={item.imageUrl || item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate leading-none mb-1">{item.name}</h4>
                    <p className="text-[11px] font-black text-sky-600">₹{item.price} {item.selectedWeight && <span className="text-[8px] text-slate-400">/ {item.selectedWeight}KG</span>}</p>
                  </div>
                  {item.selectedWeight ? (
                    <button 
                      onClick={() => {
                        setSelectedWeightProduct(item);
                        setWeightInputValue(item.selectedWeight.toString());
                        setWeightUnit('KG');
                        setWeightInputMode('weight');
                        setShowWeightModal(true);
                      }}
                      className="w-10 h-10 bg-white rounded-xl border border-gray-100 text-sky-500 hover:bg-sky-50 transition-all flex items-center justify-center shadow-sm"
                    >
                      <EyeIcon size={16} strokeWidth={3} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                      <button onClick={() => updateQuantity(item._id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"><MinusIcon size={12} strokeWidth={3} /></button>
                      <span className="text-[11px] font-black w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-sky-500 transition-colors"><PlusIcon size={12} strokeWidth={3} /></button>
                    </div>
                  )}
                  <button onClick={() => removeFromBill(item._id)} className="text-gray-300 hover:text-rose-500 transition-colors p-2"><Trash2Icon size={16} /></button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-gray-50/50 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
              <span className="text-3xl font-black text-gray-900 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button 
                onClick={() => { setPaymentMethod('CASH'); setIsSplitPayment(false); }}
                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === 'CASH' && !isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Cash
              </button>
              <button 
                onClick={() => { setPaymentMethod('CARD'); setIsSplitPayment(false); }}
                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === 'CARD' && !isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Card
              </button>
              <button 
                onClick={() => { setPaymentMethod('ONLINE'); setIsSplitPayment(false); }}
                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === 'ONLINE' && !isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Online
              </button>
              <button 
                onClick={() => { setPaymentMethod('CREDIT'); setIsSplitPayment(false); }}
                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === 'CREDIT' && !isSplitPayment ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-200' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Pay Later
              </button>
              {isB2BOrCredit && (
                <button 
                  onClick={() => { setPaymentMethod('PARTIAL'); setIsSplitPayment(false); }}
                  className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === 'PARTIAL' && !isSplitPayment ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-200' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
                >
                  Partial
                </button>
              )}
              <button 
                onClick={() => setIsSplitPayment(true)}
                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all ${isSplitPayment ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200' : 'bg-white border-transparent text-gray-400 hover:bg-gray-100'}`}
              >
                Split
              </button>
            </div>

            {paymentMethod === 'PARTIAL' && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Partial Payment Details</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Balance: ₹{(totalAmount - (parseFloat(partialPaidAmount) || 0)).toFixed(2)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black">₹</span>
                  <input 
                    type="number" 
                    placeholder="AMOUNT PAID NOW" 
                    className="w-full bg-white border-2 border-amber-200 rounded-xl py-3 pl-8 pr-4 text-xs font-black outline-none focus:border-amber-500 transition-all"
                    value={partialPaidAmount}
                    onChange={e => setPartialPaidAmount(e.target.value)}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'ONLINE' && (
              <div className="bg-sky-50 border border-sky-100 rounded-3xl p-4 flex items-center justify-center gap-3 animate-in fade-in duration-300">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100">
                  <CheckCircle2Icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Online Method Selected</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight italic">Scan QR on the printed bill to pay</p>
                </div>
              </div>
            )}

            {isSplitPayment && (
              <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                <input 
                  type="number" 
                  placeholder="CASH" 
                  className="bg-white border-2 border-sky-100 rounded-xl p-2.5 text-[10px] font-black outline-none focus:border-sky-500"
                  value={cashAmount}
                  onChange={e => { setCashAmount(Number(e.target.value)); setOnlineAmount(totalAmount - Number(e.target.value)); }}
                />
                <input 
                  type="number" 
                  placeholder="ONLINE" 
                  className="bg-white border-2 border-sky-100 rounded-xl p-2.5 text-[10px] font-black outline-none focus:border-sky-500"
                  value={onlineAmount}
                  readOnly
                />
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={isProcessing || billItems.length === 0 || !customerInfo.phone || customerInfo.phone.length !== 10}
              className="w-full bg-gray-900 text-white py-5 rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none flex items-center justify-center gap-3"
            >
              {isProcessing ? <Loader2Icon size={18} className="animate-spin" /> : <CheckCircle2Icon size={18} />}
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
