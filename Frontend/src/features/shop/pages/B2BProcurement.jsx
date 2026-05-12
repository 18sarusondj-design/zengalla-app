import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, 
  ArrowLeft, Download, FileText, CheckCircle2, 
  Loader2, AlertCircle, Eye, ShoppingCart, 
  Scale, Scan, Upload, ChevronRight, ChevronLeft, Store, Banknote, MapPin, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import api from '../../../config/api';

const B2BProcurement = () => {
  const { vendorShop } = useStore();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [procureItems, setProcureItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState(null);
  const [weightInputMode, setWeightInputMode] = useState('weight'); // 'weight' or 'amount'
  const [weightUnit, setWeightUnit] = useState('KG'); // 'KG' or 'GM'
  const [weightInputValue, setWeightInputValue] = useState('');
  
  // QR Payment States
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState(null); // { amount, proofUrl }
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartialInput, setShowPartialInput] = useState(false);
  
  // Excel Import States
  const [validationReport, setValidationReport] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const [viewMode, setViewMode] = useState('SUPPLIERS'); // 'SUPPLIERS' or 'MY_ORDERS'
  const [myOrders, setMyOrders] = useState([]);

  // Pagination States
  const [supplierPage, setSupplierPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const SUPPLIERS_PER_PAGE = 6;
  const ORDERS_PER_PAGE = 16;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/shops/my/suppliers');
      setSuppliers(data.shops || []);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    if (!vendorShop?.phone) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(`/orders?buyerPhone=${vendorShop.phone}&orderType=B2B_PROCUREMENT`);
      setMyOrders(data.orders || []);
    } catch (err) {
      toast.error("Failed to load your orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSupplierPage(1);
    setOrdersPage(1);
    if (viewMode === 'MY_ORDERS') fetchMyOrders();
    else fetchSuppliers();
  }, [viewMode, vendorShop?.phone]);

  // Reset pages on search
  useEffect(() => {
    setSupplierPage(1);
    setOrdersPage(1);
  }, [searchTerm]);

  const selectSupplier = async (supplier) => {
    setSelectedSupplier(supplier);
    setIsLoading(true);
    try {
      const { data } = await api.get(`/products?shopId=${supplier._id}`);
      setSupplierProducts(data.products || []);
      setProcureItems([]);
    } catch (err) {
      toast.error("Failed to load supplier products");
    } finally {
      setIsLoading(false);
    }
  };

  const addToProcure = (product, weight = null) => {
    setProcureItems(prev => {
      const existing = prev.find(item => item._id === product._id && (!weight || item.selectedWeight === weight));
      if (existing) {
        return prev.map(item => 
          item._id === product._id && (!weight || item.selectedWeight === weight)
            ? { ...item, quantity: item.quantity + (weight ? 0 : 1) } 
            : item
        );
      }
      return [...prev, { ...product, quantity: weight ? 1 : 1, selectedWeight: weight }];
    });
  };

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      validateImport(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const validateImport = (rows) => {
    const report = {
      missing: [],
      lowStock: [],
      valid: []
    };

    rows.forEach(row => {
      const barcode = row.Barcode || row.barcode;
      const name = row.Name || row.name || row.Product;
      const reqQty = Number(row.Quantity || row.qty || 1);

      // Match by barcode first, then name
      const product = supplierProducts.find(p => (p.barcode && p.barcode === barcode) || p.name.toLowerCase() === name?.toString().toLowerCase());

      if (!product) {
        report.missing.push({ name: name || barcode, requested: reqQty });
      } else {
        const available = Number(product.stockQuantity || product.stock || 0);
        if (available < reqQty) {
          report.lowStock.push({ ...product, requested: reqQty, available });
          if (available > 0) {
             report.valid.push({ ...product, quantity: available });
          }
        } else {
          report.valid.push({ ...product, quantity: reqQty });
        }
      }
    });

    setValidationReport(report);
    setShowValidationModal(true);
  };

  const applyValidItems = () => {
    if (!validationReport) return;
    setProcureItems(prev => {
      const newItems = [...prev];
      validationReport.valid.forEach(v => {
        const existingIdx = newItems.findIndex(i => i._id === v._id);
        if (existingIdx > -1) newItems[existingIdx].quantity += v.quantity;
        else newItems.push(v);
      });
      return newItems;
    });
    setShowValidationModal(false);
    toast.success(`Imported ${validationReport.valid.length} items successfully`);
  };

  const totalAmount = procureItems.reduce((sum, item) => {
    if (item.selectedWeight) return sum + (item.price * item.selectedWeight);
    return sum + (item.price * item.quantity);
  }, 0);

  const handleSubmitProcurement = async (confirmedAmount = 0, proofUrl = '') => {
    if (procureItems.length === 0) return toast.error("Add items first");
    setIsProcessing(true);
    try {
      const finalPaymentStatus = (paymentMethod === 'ONLINE' || confirmedAmount >= totalAmount) ? 'PAID' : (confirmedAmount > 0 ? 'PARTIAL' : 'PENDING');
      
      const payload = {
        shopId: selectedSupplier._id,
        items: procureItems.map(item => ({
          product: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          weight: item.selectedWeight
        })),
        totalPrice: totalAmount,
        paymentMethod: confirmedAmount > 0 ? (paymentMethod === 'CREDIT' ? 'SPLIT' : 'ONLINE') : paymentMethod,
        orderType: 'B2B_PROCUREMENT',
        customerName: vendorShop.name,
        phone: vendorShop.phone,
        customerBusinessName: vendorShop.name,
        customerBusinessAddress: vendorShop.address,
        customerLocation: vendorShop.location,
        paymentStatus: finalPaymentStatus,
        balanceDue: Math.max(0, totalAmount - confirmedAmount),
        onlineAmount: confirmedAmount,
        paymentProofUrl: proofUrl
      };

      const res = await api.post('/orders', payload);
      if (res.data.success) {
        toast.success(confirmedAmount > 0 ? "Procurement Order with Payment Placed!" : "Procurement Order Placed!");
        setProcureItems([]);
        setSelectedSupplier(null);
        setShowQRModal(false);
        setPaymentProofFile(null);
        setConfirmedPayment(null);
        setPartialAmount('');
        setShowPartialInput(false);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnlineOrderInit = () => {
    setPaymentAmount(totalAmount);
    setShowQRModal(true);
  };

  const handlePartialOrderInit = () => {
    const amount = parseFloat(partialAmount);
    if (!amount || amount <= 0 || amount > totalAmount) {
      return toast.error("Enter a valid partial amount");
    }
    setPaymentAmount(amount);
    setShowQRModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!paymentProofFile) return toast.error("Please upload payment screenshot");
    
    setIsUploadingProof(true);
    try {
      const pData = new FormData();
      pData.append('image', paymentProofFile);
      const { data } = await api.post('/upload/image', pData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      setConfirmedPayment({ amount: paymentAmount, proofUrl: data.url });
      setShowQRModal(false);
      toast.success("Payment Proof Uploaded! Now click Place Order.");
    } catch (err) {
      toast.error("Failed to upload screenshot");
} finally {
      setIsUploadingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-10 font-sans">
      {/* Dynamic Header */}
      {!selectedSupplier && (
        <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-sky-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-sky-200">
               <ShoppingBag size={36} className="text-white" />
            </div>
            <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">B2B Procurement</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Restock your inventory from trusted partners</p>
            </div>
          </div>

          <div className="flex bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm self-start md:self-center">
             <button 
               onClick={() => setViewMode('SUPPLIERS')}
               className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'SUPPLIERS' ? 'bg-sky-500 text-white shadow-xl shadow-sky-100' : 'text-slate-400 hover:bg-slate-50'}`}
             >Browse Suppliers</button>
             <button 
               onClick={() => setViewMode('MY_ORDERS')}
               className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MY_ORDERS' ? 'bg-sky-500 text-white shadow-xl shadow-sky-100' : 'text-slate-400 hover:bg-slate-50'}`}
             >My Purchases</button>
          </div>
        </div>
      )}

      {/* Main Views */}
      {!selectedSupplier ? (
        viewMode === 'SUPPLIERS' ? (
          <div className="max-w-7xl mx-auto">
            {/* Search Section */}
            <div className="relative mb-12">
               <div className="absolute inset-y-0 left-6 flex items-center text-slate-300">
                  <Search size={24} />
               </div>
               <input 
                 type="text" 
                 placeholder="Search verified suppliers, products, or locations..."
                 className="w-full bg-white border border-slate-100 rounded-[32px] py-6 pl-16 pr-8 text-sm font-bold text-slate-900 focus:outline-none focus:border-sky-500 focus:shadow-2xl focus:shadow-sky-100 transition-all shadow-sm"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>

            {/* Suppliers Grid */}
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-50">
                 <Loader2 size={40} className="animate-spin text-sky-500" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Network...</p>
              </div>
            ) : suppliers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {suppliers
                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice((supplierPage - 1) * SUPPLIERS_PER_PAGE, supplierPage * SUPPLIERS_PER_PAGE)
                    .map(supplier => (
                    <div 
                      key={supplier._id} 
                      className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-slate-50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                           <img src={supplier.imageUrl || 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">{supplier.name}</h3>
                           <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verified Supplier</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Location</span>
                           <div className="flex items-center gap-2 text-slate-500">
                              <MapPin size={14} />
                              <span className="text-[11px] font-bold truncate max-w-[150px]">{supplier.address}</span>
                           </div>
                        </div>
                        <button 
                          onClick={() => selectSupplier(supplier)}
                          className="w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all active:scale-90 shadow-sm"
                        >
                           <ChevronRight size={24} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination UI for Suppliers */}
                {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length > SUPPLIERS_PER_PAGE && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button 
                      disabled={supplierPage === 1}
                      onClick={() => setSupplierPage(p => p - 1)}
                      className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: Math.ceil(suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length / SUPPLIERS_PER_PAGE) }).map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setSupplierPage(i + 1)}
                        className={`w-12 h-12 rounded-2xl font-black text-[10px] uppercase transition-all ${supplierPage === i + 1 ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                      >{i + 1}</button>
                    ))}
                    <button 
                      disabled={supplierPage === Math.ceil(suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length / SUPPLIERS_PER_PAGE)}
                      onClick={() => setSupplierPage(p => p + 1)}
                      className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-[48px] p-20 text-center border border-slate-100">
                 <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <Store size={40} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Suppliers Found</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Ask your suppliers to add you as a B2B partner</p>
              </div>
            )}
          </div>
        ) : (
          /* My Orders View */
          <div className="max-w-5xl mx-auto">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-50">
                 <Loader2 size={40} className="animate-spin text-sky-500" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading History...</p>
              </div>
            ) : myOrders.length > 0 ? (
              <>
                <div className="space-y-4">
                  {myOrders
                    .slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE)
                    .map(order => (
                    <div key={order._id} className="bg-white rounded-[32px] p-6 border border-slate-100 flex items-center justify-between hover:shadow-xl transition-all group">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                             <Store size={28} className="text-slate-300" />
                          </div>
                          <div>
                             <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order #{(order._id || '').toString().slice(-6).toUpperCase()}</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                   {order.paymentStatus}
                                </span>
                             </div>
                             <h3 className="text-xl font-black text-slate-900 uppercase leading-none">{order.shopId?.name || 'Wholesale Shop'}</h3>
                             <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{(order.items || []).length} Products · ₹{order.totalPrice}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right mr-4">
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Placed On</p>
                             <p className="text-xs font-black text-slate-600 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[10px] font-black px-4 py-2 rounded-xl border ${
                            order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                          }`}>
                             {order.status}
                          </span>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Pagination UI for Orders */}
                {myOrders.length > ORDERS_PER_PAGE && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button 
                      disabled={ordersPage === 1}
                      onClick={() => setOrdersPage(p => p - 1)}
                      className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: Math.ceil(myOrders.length / ORDERS_PER_PAGE) }).map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setOrdersPage(i + 1)}
                        className={`w-12 h-12 rounded-2xl font-black text-[10px] uppercase transition-all ${ordersPage === i + 1 ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                      >{i + 1}</button>
                    ))}
                    <button 
                      disabled={ordersPage === Math.ceil(myOrders.length / ORDERS_PER_PAGE)}
                      onClick={() => setOrdersPage(p => p + 1)}
                      className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-[48px] p-20 text-center border-2 border-dashed border-slate-100">
                 <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <ShoppingCart size={40} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Purchases Yet</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Your procurement history will appear here</p>
              </div>
            )}
          </div>
        )
      ) : (
        /* Full Screen Procurement Detail Dashboard */
        <div className="flex flex-col h-[90vh] bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
          {/* Supplier Header */}
          <div className="bg-slate-900 px-10 py-8 flex items-center justify-between shadow-sm z-10 text-white">
             <div className="flex items-center gap-8">
                <button onClick={() => setSelectedSupplier(null)} className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all border border-white/10">
                   <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-white rounded-[24px] overflow-hidden border-2 border-white/20 shadow-xl">
                      <img src={selectedSupplier.imageUrl} className="w-full h-full object-cover" />
                   </div>
                   <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedSupplier.name}</h2>
                        <button 
                          onClick={() => {
                            const query = selectedSupplier.address || selectedSupplier.name;
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                          }}
                          className="text-sky-400 hover:text-sky-300 transition-all p-1.5 bg-white/5 rounded-lg border border-white/10"
                          title="View on Google Maps"
                        >
                          <MapPin size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mt-1">Active Procurement Session</p>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                   <Upload size={20} className="group-hover:animate-bounce" />
                   <span className="text-[11px] font-black uppercase tracking-[0.2em]">Bulk Import</span>
                   <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} />
                </label>
                <div className="relative">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                   <input 
                     type="text" 
                     placeholder="STOCK SEARCH..." 
                     className="pl-16 pr-8 py-4 bg-white/5 border border-white/10 rounded-2xl w-80 text-xs font-black uppercase focus:bg-white focus:text-slate-900 focus:outline-none transition-all shadow-inner"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* Product Grid */}
             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                   {supplierProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                      const stock = Number(p.stockQuantity || p.stock || 0);
                      return (
                        <div 
                          key={p._id} 
                          onClick={() => {
                            if (p.sellingType === 'weight' || p.selling_type === 'weight') {
                              setSelectedWeightProduct(p);
                              setShowWeightModal(true);
                            } else {
                              addToProcure(p);
                            }
                          }}
                          className={`group bg-white rounded-[40px] p-6 border border-slate-100 hover:border-sky-500 hover:shadow-2xl transition-all cursor-pointer flex flex-col relative ${stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                        >
                           <div className="aspect-square bg-slate-50 rounded-[32px] mb-6 overflow-hidden relative">
                              <img src={p.imageUrl || p.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                              <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-white shadow-xl">
                                 ₹{p.price}
                              </div>
                           </div>
                           <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-2 line-clamp-1">{p.name}</h5>
                           <div className="mt-auto flex items-center justify-between">
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                 Stock: <span className={stock < 10 ? 'text-rose-500' : 'text-emerald-500'}>{stock}</span>
                              </div>
                              <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                                 <Plus size={20} strokeWidth={3} />
                              </div>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>

             {/* Order Sidebar */}
             <div className="w-[450px] bg-slate-50 border-l border-slate-100 flex flex-col shadow-inner">
                <div className="p-10 border-b border-slate-200 flex items-center justify-between bg-white">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-100">
                         <ShoppingCart size={24} />
                      </div>
                      <div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Cart Manifest</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{procureItems.length} Products Registered</p>
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                   {procureItems.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-20">
                        <ShoppingCart size={80} className="text-slate-300" strokeWidth={1} />
                        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-500">Manifest is Empty</p>
                     </div>
                   ) : (
                     procureItems.map(item => (
                       <div key={item._id} className="bg-white rounded-[32px] p-6 flex items-center gap-6 group hover:shadow-xl transition-all border border-slate-100">
                          <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                             <img src={item.imageUrl || item.image} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h6 className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate mb-2">{item.name}</h6>
                             <p className="text-lg font-black text-sky-600 tracking-tighter leading-none">₹{item.price} {item.selectedWeight && <span className="text-[9px] text-slate-400 tracking-normal ml-1">/ {item.selectedWeight}KG</span>}</p>
                          </div>
                          <div className="flex flex-col gap-3">
                             {item.selectedWeight ? (
                               <button 
                                 onClick={() => {
                                   setSelectedWeightProduct(item);
                                   setWeightInputValue(item.selectedWeight.toString());
                                   setWeightUnit('KG');
                                   setWeightInputMode('weight');
                                   setShowWeightModal(true);
                                 }}
                                 className="w-12 h-12 bg-slate-50 rounded-2xl text-sky-500 hover:bg-sky-600 hover:text-white transition-all flex items-center justify-center border border-slate-100"
                               >
                                 <Eye size={20} strokeWidth={3} />
                               </button>
                             ) : (
                               <div className="flex flex-col items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                 <button onClick={() => setProcureItems(prev => prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-sky-500"><Plus size={16} /></button>
                                 <span className="text-[14px] font-black px-2">{item.quantity}</span>
                                 <button onClick={() => setProcureItems(prev => prev.map(i => i._id === item._id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500"><Minus size={16} /></button>
                               </div>
                             )}
                             <button 
                               onClick={() => setProcureItems(prev => prev.filter(i => i._id !== item._id))}
                               className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-rose-500 transition-colors"
                             ><Trash2 size={24} /></button>
                          </div>
                       </div>
                     ))
                   )}
                </div>

                <div className="p-10 bg-white border-t border-slate-200 space-y-8">
                   <div className="flex items-center justify-between">
                      <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Gross Bill</span>
                      <span className="text-5xl font-black text-slate-900 tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                   </div>

                   <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'ONLINE', label: 'Direct Pay', icon: <Banknote size={18} />, color: 'sky' },
                        { id: 'PARTIAL', label: 'Split Pay', icon: <Scan size={18} />, color: 'amber' },
                        { id: 'CREDIT', label: 'On Account', icon: <AlertCircle size={18} />, color: 'rose' }
                      ].map(method => (
                        <button 
                          key={method.id}
                          onClick={() => {
                            setPaymentMethod(method.id);
                            setShowPartialInput(method.id === 'PARTIAL');
                            setConfirmedPayment(null);
                            if (method.id === 'ONLINE') handleOnlineOrderInit();
                          }}
                          className={`py-5 rounded-3xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 border ${paymentMethod === method.id ? `bg-${method.color}-500 text-white border-${method.color}-500 shadow-2xl` : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                        >
                           {method.icon} {method.label}
                        </button>
                      ))}
                   </div>

                   {paymentMethod === 'PARTIAL' && !confirmedPayment && (
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 animate-in slide-in-from-top-4 duration-300">
                         <p className="text-[10px] font-black text-amber-600 uppercase mb-4 tracking-widest">Initialization Deposit</p>
                         <div className="flex gap-4">
                            <input 
                              type="number" 
                              placeholder="0.00"
                              className="flex-1 bg-white border-2 border-amber-200 rounded-2xl px-6 py-4 text-xl font-black outline-none focus:border-sky-500 transition-all"
                              value={partialAmount}
                              onChange={e => setPartialAmount(e.target.value)}
                            />
                            <button 
                              onClick={handlePartialOrderInit}
                              className="px-10 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all"
                            >Initialize</button>
                         </div>
                      </div>
                    )}

                    {confirmedPayment && (
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between animate-in zoom-in-95">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Receipt Logged</p>
                            <p className="text-xl font-black text-emerald-700 tracking-tighter">₹{confirmedPayment.amount}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setConfirmedPayment(null)}
                          className="w-10 h-10 bg-white text-emerald-500 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all border border-emerald-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => {
                        if ((paymentMethod === 'ONLINE' || paymentMethod === 'PARTIAL') && !confirmedPayment) {
                          return toast.error(`Make payment first! You have clicked ${paymentMethod === 'PARTIAL' ? 'Partial' : 'Online'}, otherwise click Pay Later.`);
                        }
                        handleSubmitProcurement(confirmedPayment?.amount || 0, confirmedPayment?.proofUrl || '');
                      }}
                      disabled={isProcessing || procureItems.length === 0}
                      className={`w-full py-8 rounded-[40px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 ${((paymentMethod === 'ONLINE' || paymentMethod === 'PARTIAL') && !confirmedPayment) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-sky-600 hover:scale-[1.02] active:scale-95 shadow-sky-100/20'}`}
                    >
                       {isProcessing ? <Loader2 className="animate-spin" /> : <ShoppingCart size={24} />}
                       {(paymentMethod === 'ONLINE' || paymentMethod === 'PARTIAL') ? (confirmedPayment ? 'Seal & Finalize Manifest' : 'Initiate Secure Payment') : 'Commit To Wholesale Ledger'}
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && validationReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Import Validation Report</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Found {validationReport.valid.length} valid items, {validationReport.missing.length + validationReport.lowStock.length} issues</p>
                 </div>
                 <button onClick={() => setShowValidationModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm"><Trash2 size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                 {/* Errors Section */}
                 {(validationReport.missing.length > 0 || validationReport.lowStock.length > 0) && (
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 text-rose-500">
                         <AlertCircle size={24} />
                         <h4 className="text-sm font-black uppercase tracking-[0.2em]">Attention Required</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Missing Items */}
                         {validationReport.missing.length > 0 && (
                           <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100">
                              <h5 className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-4">Products Not Found in Supplier Catalog</h5>
                              <div className="space-y-3">
                                 {validationReport.missing.map((m, idx) => (
                                   <div key={idx} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-rose-100/50">
                                      <span className="text-[10px] font-bold text-slate-700 truncate">{m.name}</span>
                                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Missing</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}

                         {/* Low Stock Items */}
                         {validationReport.lowStock.length > 0 && (
                           <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                              <h5 className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-4">Insufficient Supplier Stock</h5>
                              <div className="space-y-3">
                                 {validationReport.lowStock.map((l, idx) => (
                                   <div key={idx} className="bg-white/50 p-3 rounded-xl border border-amber-100/50 space-y-1">
                                      <div className="flex items-center justify-between">
                                         <span className="text-[10px] font-bold text-slate-700 truncate">{l.name}</span>
                                         <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Partial</span>
                                      </div>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase">Requested: {l.requested} | Available: {l.available}</p>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                 )}

                 {/* Success Section */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 text-emerald-500">
                       <CheckCircle2 size={24} />
                       <h4 className="text-sm font-black uppercase tracking-[0.2em]">Ready to Import</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {validationReport.valid.map((v, idx) => (
                         <div key={idx} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                               <ShoppingCart size={14} className="text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-[9px] font-black text-slate-900 truncate uppercase">{v.name}</p>
                               <p className="text-[8px] font-bold text-emerald-600 uppercase">QTY: {v.quantity}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                 <button onClick={() => setShowValidationModal(false)} className="flex-1 py-5 bg-white text-slate-400 rounded-3xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50">Cancel Import</button>
                 <button 
                   onClick={applyValidItems}
                   disabled={validationReport.valid.length === 0}
                   className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all disabled:opacity-50"
                 >
                    Import Valid Items Only ({validationReport.valid.length})
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Weight Modal */}
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
                      <button onClick={() => setShowWeightModal(false)} className="text-gray-300 hover:text-rose-500 transition-all p-1 bg-gray-50 rounded-full">
                        <Trash2 size={16} strokeWidth={3} />
                      </button>
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
                      <Scale size={14} /> By Weight
                   </button>
                   <button 
                     onClick={() => setWeightInputMode('amount')}
                     className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${weightInputMode === 'amount' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                      <Banknote size={14} /> By Amount (₹)
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
                          addToProcure(selectedWeightProduct, calculatedWeight);
                          setShowWeightModal(false);
                          setWeightInputValue('');
                        }
                     }}
                     className="py-5 bg-[#0a0f1d] text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                   >
                      <Plus size={16} /> Add to Cart
                   </button>
                </div>
             </div>
          </div>
        );
      })()}
      {/* QR Payment Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-200 flex flex-col relative overflow-hidden text-center">
              <div className="mb-8">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Complete Payment</h3>
                 <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">Scan QR to pay ₹{paymentAmount}</p>
                 {/* QR Placeholder */}
                 <div className="aspect-square bg-slate-50 rounded-[32px] border-4 border-slate-100 flex items-center justify-center mb-8 p-6 relative group">
                    <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[28px]" />
                    {selectedSupplier.bankDetails?.upiId ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${selectedSupplier.bankDetails.upiId}&pn=${selectedSupplier.name.replace(/[^a-zA-Z0-9 ]/g, "")}&am=${paymentAmount}&cu=INR&tn=Procurement_Payment`)}`} 
                        alt="QR Code" 
                        className="w-full h-full object-contain relative z-10"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <XCircle size={40} className="mx-auto text-rose-400 mb-2" />
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Supplier UPI ID Missing</p>
                        <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Contact supplier to update profile</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="relative">
                    <input 
                      type="file" 
                      id="proof-upload" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => setPaymentProofFile(e.target.files[0])} 
                    />
                    <label 
                      htmlFor="proof-upload"
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
                      onClick={() => setShowQRModal(false)}
                      className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                    >Back</button>
                    <button 
                      onClick={handleConfirmPayment}
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
    </div>
  );
};

export default B2BProcurement;
