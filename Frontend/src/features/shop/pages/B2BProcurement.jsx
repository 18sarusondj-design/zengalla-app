import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [productPage, setProductPage] = useState(1);
  const SUPPLIERS_PER_PAGE = 8;
  const ORDERS_PER_PAGE = 16;

  const [sessionViewMode, setSessionViewMode] = useState('GRID');
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const rowRefs = useRef([]);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSessionViewMode('SHEET');
    } else {
      setSessionViewMode('GRID');
    }
  }, []);

  useEffect(() => {
    setFocusedRowIndex(0);
    setSelectedRowIds(new Set());
  }, [searchTerm, selectedSupplier]);

  useEffect(() => {
    setFocusedRowIndex(0);
  }, [productPage]);

  useEffect(() => {
    if (sessionViewMode === 'SHEET' && rowRefs.current[focusedRowIndex]) {
      rowRefs.current[focusedRowIndex].focus();
    }
  }, [focusedRowIndex, sessionViewMode]);

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

  const handleDeleteOrder = (orderId) => {
    toast.error("Delete this purchase record?", {
      description: "This will permanently remove the record from your procurement history.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const { data } = await api.delete(`/orders/${orderId}`);
            if (data.success) {
              setMyOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
              toast.success("Record deleted");
            }
          } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Failed to delete record");
          }
        }
      }
    });
  };

  const handleClearHistory = async () => {
    if (myOrders.length === 0) {
      toast.info("No purchases to clear.");
      return;
    }

    toast.error("Clear B2B purchase history?", {
      description: `This will permanently delete all ${myOrders.length} purchases from your history.`,
      action: {
        label: "Clear All",
        onClick: async () => {
          const toastId = toast.loading("Clearing history...");
          try {
            await Promise.all(myOrders.map(o => api.delete(`/orders/${o._id}`)));
            setMyOrders([]);
            toast.success("Procurement history cleared", { id: toastId });
          } catch (err) {
            console.error("Clear history failed:", err);
            toast.error("Failed to clear some records", { id: toastId });
            fetchMyOrders();
          }
        }
      }
    });
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
    setProductPage(1);
  }, [searchTerm]);

  const selectSupplier = async (supplier) => {
    setSelectedSupplier(supplier);
    setProductPage(1);
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

  const getB2BPrice = (product) => {
    return (product.wholesalePrice && product.wholesalePrice > 0) ? product.wholesalePrice : product.price;
  };

  const addToProcure = (product, weight = null) => {
    const b2bPrice = getB2BPrice(product);
    setProcureItems(prev => {
      const existing = prev.find(item => item._id === product._id && (!weight || item.selectedWeight === weight));
      if (existing) {
        return prev.map(item => 
          item._id === product._id && (!weight || item.selectedWeight === weight)
            ? { ...item, quantity: item.quantity + (weight ? 0 : 1), price: b2bPrice } 
            : item
        );
      }
      return [...prev, { ...product, price: b2bPrice, quantity: 1, selectedWeight: weight }];
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

  const updateProcureQuantity = (product, newQty) => {
    const stock = Number(product.stockQuantity || product.stock || 0);
    if (newQty > stock) {
      toast.error(`Only ${stock} items available in stock`);
      newQty = stock;
    }
    
    setProcureItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (newQty <= 0) {
        return prev.filter(item => item._id !== product._id);
      }
      if (existing) {
        return prev.map(item => 
          item._id === product._id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { ...product, price: getB2BPrice(product), quantity: newQty }];
    });
  };

  const toggleRowSelection = (productId) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleAddSelectedToManifest = () => {
    if (selectedRowIds.size === 0) {
      toast.error("No items selected");
      return;
    }
    
    let addedCount = 0;
    setProcureItems(prev => {
      const updated = [...prev];
      selectedRowIds.forEach(id => {
        const product = supplierProducts.find(p => p._id === id);
        if (product) {
          const existing = updated.find(item => item._id === id);
          if (!existing) {
            const moq = Number(product.minimumOrderQuantity || product.minimum_order_quantity || 1);
            updated.push({
              ...product,
              price: getB2BPrice(product),
              quantity: moq
            });
            addedCount++;
          }
        }
      });
      return updated;
    });
    
    toast.success(`Added ${addedCount} new items to manifest`);
    setSelectedRowIds(new Set());
  };

  const handleB2BTableKeyDown = (e, product, idx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.min(paginatedSupplierProducts.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      toggleRowSelection(product._id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (product.sellingType === 'weight' || product.selling_type === 'weight') {
        setSelectedWeightProduct(product);
        setShowWeightModal(true);
      } else {
        const item = procureItems.find(i => i._id === product._id);
        if (item) {
          toast.info(`${product.name} is already in manifest`);
        } else {
          const moq = Number(product.minimumOrderQuantity || product.minimum_order_quantity || 1);
          updateProcureQuantity(product, moq);
          toast.success(`Added ${product.name} to manifest`);
        }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!(product.sellingType === 'weight' || product.selling_type === 'weight')) {
        const item = procureItems.find(i => i._id === product._id);
        const currentQty = item ? item.quantity : 0;
        const moq = Number(product.minimumOrderQuantity || product.minimum_order_quantity || 1);
        const nextQty = currentQty === 0 ? moq : currentQty + 1;
        updateProcureQuantity(product, nextQty);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (!(product.sellingType === 'weight' || product.selling_type === 'weight')) {
        const item = procureItems.find(i => i._id === product._id);
        const currentQty = item ? item.quantity : 0;
        if (currentQty > 0) {
          updateProcureQuantity(product, currentQty - 1);
        }
      }
    }
  };

  const totalAmount = procureItems.reduce((sum, item) => {
    if (item.selectedWeight) return sum + (item.price * item.selectedWeight);
    return sum + (item.price * item.quantity);
  }, 0);

  const PRODUCTS_PER_PAGE = 12;
  const filteredSupplierProducts = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return supplierProducts.filter(p => p.name.toLowerCase().includes(query));
  }, [supplierProducts, searchTerm]);

  const paginatedSupplierProducts = useMemo(() => {
    return filteredSupplierProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);
  }, [filteredSupplierProducts, productPage]);

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
    <div className={`bg-slate-50/50 font-sans ${selectedSupplier ? 'lg:h-screen lg:overflow-hidden flex flex-col gap-0 p-0 lg:p-0' : 'min-h-screen overflow-y-auto p-4 lg:p-10'}`}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {suppliers
                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice((supplierPage - 1) * SUPPLIERS_PER_PAGE, supplierPage * SUPPLIERS_PER_PAGE)
                    .map(supplier => (
                    <div 
                      key={supplier._id} 
                      onClick={() => selectSupplier(supplier)}
                      className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden cursor-pointer"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-[20px] overflow-hidden border-2 border-slate-50 shadow-inner group-hover:scale-105 transition-transform duration-500 flex-shrink-0">
                           <img src={supplier.imageUrl || 'https://cdn-icons-png.flaticon.com/512/1261/1261163.png'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none mb-1.5">{supplier.name}</h3>
                           <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified Supplier</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex flex-col min-w-0">
                           <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Location</span>
                           <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin size={12} className="flex-shrink-0" />
                              <span className="text-[10px] font-bold truncate max-w-[120px]">{supplier.address}</span>
                           </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            selectSupplier(supplier);
                          }}
                          className="w-10 h-10 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all active:scale-90 shadow-sm flex-shrink-0"
                        >
                           <ChevronRight size={18} />
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
                  {myOrders.length > 0 && (
                   <div className="flex justify-end mb-4">
                     <button
                       onClick={handleClearHistory}
                       className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                     >
                       Clear History
                     </button>
                   </div>
                 )}
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
                       <div className="flex items-center gap-4 text-right">
                          <div className="text-right mr-4">
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Placed On</p>
                             <p className="text-xs font-black text-slate-600 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[10px] font-black px-4 py-2 rounded-xl border ${
                            order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                          }`}>
                             {order.status}
                          </span>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDeleteOrder(order._id);
                             }}
                             className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 flex items-center justify-center transition-all active:scale-95 ml-2"
                             title="Delete Purchase"
                           >
                             <Trash2 size={16} />
                           </button>
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
        <div className="flex flex-col flex-1 min-h-0 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Supplier Header */}
          <div className="bg-sky-500 px-6 md:px-10 py-6 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-0 shadow-sm z-10 text-white">
             <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                <button onClick={() => setSelectedSupplier(null)} className="w-10 h-10 md:w-12 md:h-12 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white hover:text-sky-600 transition-all border border-white/10 flex-shrink-0">
                   <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-[16px] md:rounded-[24px] overflow-hidden border-2 border-white/20 shadow-xl flex-shrink-0">
                      <img src={selectedSupplier.imageUrl} className="w-full h-full object-cover" />
                   </div>
                   <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter truncate">{selectedSupplier.name}</h2>
                        <button 
                          onClick={() => {
                            const query = selectedSupplier.address || selectedSupplier.name;
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                          }}
                          className="text-sky-100 hover:text-white transition-all p-1 bg-white/5 rounded-lg border border-white/10 flex-shrink-0"
                          title="View on Google Maps"
                        >
                           <MapPin size={12} strokeWidth={3} />
                        </button>
                      </div>
                      <p className="text-[8px] md:text-[10px] font-black text-sky-100 uppercase tracking-[0.3em] mt-0.5">Active Procurement Session</p>
                   </div>
                </div>
             </div>

             <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl cursor-pointer hover:bg-white/10 transition-all group flex-shrink-0">
                   <Upload size={16} className="group-hover:animate-bounce" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bulk Import</span>
                   <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} />
                </label>
                <div className="relative flex-1 md:flex-none">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-100" size={16} />
                   <input 
                     type="text" 
                     placeholder="STOCK SEARCH..." 
                     className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl w-full md:w-64 xl:w-80 text-[10px] font-black uppercase focus:bg-white focus:text-slate-900 focus:outline-none transition-all shadow-inner text-white placeholder-sky-200"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>

                 {/* View Switcher Toggle */}
                 <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 flex-shrink-0">
                   <button
                     onClick={() => setSessionViewMode('GRID')}
                     className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                       sessionViewMode === 'GRID' ? 'bg-white text-sky-600 shadow-sm' : 'text-white/80 hover:bg-white/5 hover:text-white'
                     }`}
                   >
                     Grid View
                   </button>
                   <button
                     onClick={() => setSessionViewMode('SHEET')}
                     className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                       sessionViewMode === 'SHEET' ? 'bg-white text-sky-600 shadow-sm' : 'text-white/80 hover:bg-white/5 hover:text-white'
                     }`}
                   >
                     Sheet View
                   </button>
                 </div>
              </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
             {/* Product Listing */}
             <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar flex flex-col justify-between">
                {sessionViewMode === 'GRID' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
                     {paginatedSupplierProducts.map(p => {
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
                            className={`group bg-white rounded-[24px] p-4 border border-slate-100 hover:border-sky-500 hover:shadow-xl transition-all cursor-pointer flex flex-col relative ${stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                          >
                             <div className="aspect-square bg-slate-50 rounded-[16px] mb-4 overflow-hidden relative">
                                <img src={p.imageUrl || p.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                                <div className="absolute top-2.5 right-2.5 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black text-white shadow-md flex flex-col items-end leading-none">
                                   <span>B2B: ₹{getB2BPrice(p)}</span>
                                   {p.wholesalePrice && p.wholesalePrice > 0 && (
                                     <span className="text-[6.5px] text-slate-400 line-through mt-0.5">Ret: ₹{p.price}</span>
                                   )}
                                </div>
                             </div>
                             <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-1.5 line-clamp-1">{p.name}</h5>
                             <div className="mt-auto flex items-center justify-between">
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                   Stock: <span className={stock < 10 ? 'text-rose-500' : 'text-emerald-500'}>{parseFloat(stock.toFixed(2))}</span>
                                </div>
                                <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                                   <Plus size={16} strokeWidth={3} />
                                </div>
                             </div>
                          </div>
                        );
                     })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Bulk Manifest Action Banner */}
                    {selectedRowIds.size > 0 && (
                      <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
                        <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider">
                          {selectedRowIds.size} {selectedRowIds.size === 1 ? 'Product' : 'Products'} Selected
                        </span>
                        <button
                          onClick={handleAddSelectedToManifest}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-sky-200 active:scale-95"
                        >
                          Add Selected ({selectedRowIds.size}) to Manifest
                        </button>
                      </div>
                    )}

                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[9px] font-black sticky top-0 z-10">
                            <th className="px-4 py-3 text-center w-12">
                              <input
                                type="checkbox"
                                checked={paginatedSupplierProducts.length > 0 && paginatedSupplierProducts.every(p => selectedRowIds.has(p._id))}
                                onChange={() => {
                                  const allPageSelected = paginatedSupplierProducts.length > 0 && paginatedSupplierProducts.every(p => selectedRowIds.has(p._id));
                                  setSelectedRowIds(prev => {
                                    const next = new Set(prev);
                                    if (allPageSelected) {
                                      paginatedSupplierProducts.forEach(p => next.delete(p._id));
                                    } else {
                                      paginatedSupplierProducts.forEach(p => next.add(p._id));
                                    }
                                    return next;
                                  });
                                }}
                                className="rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                              />
                            </th>
                            <th className="px-4 py-3">Product Name</th>
                            <th className="px-4 py-3">Barcode / SKU</th>
                            <th className="px-4 py-3 text-right">Wholesale Price</th>
                            <th className="px-4 py-3 text-center">Available Stock</th>
                            <th className="px-4 py-3 text-center">Min Order Qty</th>
                            <th className="px-4 py-3 text-center">Procurement Qty</th>
                            <th className="px-4 py-3">Supplier</th>
                            <th className="px-4 py-3 text-center">Add To Manifest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedSupplierProducts.map((p, idx) => {
                            const stock = Number(p.stockQuantity || p.stock || 0);
                            const isOutOfStock = stock <= 0;
                            const procureItem = procureItems.find(item => item._id === p._id);
                            const procureQty = procureItem ? procureItem.quantity : 0;
                            const isFocused = focusedRowIndex === idx;
                            const isSelected = selectedRowIds.has(p._id);
                            const moq = Number(p.minimumOrderQuantity || p.minimum_order_quantity || 1);

                            return (
                              <tr
                                key={p._id}
                                ref={el => rowRefs.current[idx] = el}
                                tabIndex={0}
                                onKeyDown={e => handleB2BTableKeyDown(e, p, idx)}
                                onFocus={() => setFocusedRowIndex(idx)}
                                className={`border-b border-slate-100 text-[10px] font-medium transition-colors outline-none ${
                                  isFocused 
                                    ? 'bg-sky-50/80 ring-1 ring-inset ring-sky-500/20' 
                                    : 'even:bg-slate-50/30 hover:bg-slate-50/50'
                                } ${isOutOfStock ? 'opacity-60' : ''}`}
                              >
                                <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleRowSelection(p._id)}
                                    className="rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                                  />
                                </td>
                                <td className="px-4 py-2.5 font-bold uppercase text-slate-800">
                                  {p.name}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-slate-400">
                                  {p.barcode || 'N/A'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-black text-sky-600">
                                  <div className="flex flex-col items-end">
                                    <span>₹{getB2BPrice(p).toFixed(2)}</span>
                                    {p.wholesalePrice && p.wholesalePrice > 0 && (
                                      <span className="text-[7px] text-slate-400 line-through">Ret: ₹{p.price}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`font-bold ${stock < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {parseFloat(stock.toFixed(2))}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center font-bold text-slate-500">
                                  {moq}
                                </td>
                                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                  {p.sellingType === 'weight' || p.selling_type === 'weight' ? (
                                    <div className="text-center text-slate-400 font-bold uppercase text-[8px]">
                                      Weight Mode
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => updateProcureQuantity(p, procureQty - 1)}
                                        className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-colors"
                                      >
                                        <Minus size={10} />
                                      </button>
                                      <input
                                        type="number"
                                        value={procureQty || ''}
                                        onChange={e => {
                                          const val = parseInt(e.target.value) || 0;
                                          updateProcureQuantity(p, val);
                                        }}
                                        placeholder="0"
                                        className="w-10 text-center border border-slate-200 rounded py-0.5 text-[10px] font-black outline-none focus:border-sky-500"
                                      />
                                      <button
                                        onClick={() => updateProcureQuantity(p, procureQty + 1)}
                                        className="w-5 h-5 rounded bg-slate-100 hover:bg-sky-100 hover:text-sky-600 text-slate-500 flex items-center justify-center transition-colors"
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 font-bold uppercase truncate max-w-[120px]">
                                  {selectedSupplier.name}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    onClick={() => {
                                      if (p.sellingType === 'weight' || p.selling_type === 'weight') {
                                        setSelectedWeightProduct(p);
                                        setShowWeightModal(true);
                                      } else {
                                        const nextQty = procureQty === 0 ? moq : procureQty;
                                        updateProcureQuantity(p, nextQty);
                                        toast.success(`Added ${p.name}`);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                      procureQty > 0 
                                        ? 'bg-emerald-500 text-white shadow-sm' 
                                        : 'bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white'
                                    }`}
                                  >
                                    {procureQty > 0 ? 'Added' : 'Add'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {paginatedSupplierProducts.length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-bold uppercase">
                                No products found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pagination UI for Products */}
                {filteredSupplierProducts.length > PRODUCTS_PER_PAGE && (
                  <div className="mt-8 flex items-center justify-center gap-1.5">
                    <button 
                      onClick={() => setProductPage(prev => Math.max(1, prev - 1))}
                      disabled={productPage === 1}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: Math.ceil(filteredSupplierProducts.length / PRODUCTS_PER_PAGE) }).map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setProductPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${productPage === i + 1 ? 'bg-sky-500 text-white shadow-md' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      onClick={() => setProductPage(prev => Math.min(Math.ceil(filteredSupplierProducts.length / PRODUCTS_PER_PAGE), prev + 1))}
                      disabled={productPage === Math.ceil(filteredSupplierProducts.length / PRODUCTS_PER_PAGE)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
             </div>

             {/* Order Sidebar */}
             <div className="w-full md:w-[380px] xl:w-[450px] bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col shadow-inner max-h-[50vh] md:max-h-none flex-shrink-0">
                <div className="p-6 md:p-8 border-b border-slate-200 flex items-center justify-between bg-white">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
                         <ShoppingCart size={20} />
                      </div>
                      <div>
                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Cart Manifest</h3>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{procureItems.length} Products Registered</p>
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
                   {procureItems.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
                        <ShoppingCart size={60} className="text-slate-300" strokeWidth={1} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Manifest is Empty</p>
                     </div>
                   ) : (
                      procureItems.map(item => {
                      const isSheet = sessionViewMode === 'SHEET';
                      return (
                        <div 
                          key={item._id} 
                          className={`flex items-center justify-between border transition-all ${
                            isSheet 
                              ? 'bg-slate-50/40 rounded-xl py-2 px-3 gap-2 border-slate-100 hover:bg-white hover:shadow-sm' 
                              : 'bg-slate-50/50 rounded-[24px] p-4 gap-4 border-slate-100 hover:shadow-lg'
                          }`}
                        >
                          {!isSheet && (
                            <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-slate-100 flex-shrink-0">
                               <img src={item.imageUrl || item.image} className="w-full h-full object-cover" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                             <h6 className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">
                               {item.name}
                             </h6>
                             <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] font-black text-sky-600 leading-none">
                                  ₹{item.price}
                                </span>
                                {item.selectedWeight && (
                                  <span className="text-[8px] text-slate-400 tracking-normal ml-1">
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
                                 className={`bg-white rounded-lg border border-slate-100 text-sky-500 hover:bg-sky-600 hover:text-white transition-all flex items-center justify-center ${
                                   isSheet ? 'w-6 h-6' : 'w-8 h-8'
                                 }`}
                               >
                                 <Eye size={isSheet ? 12 : 16} strokeWidth={3} />
                               </button>
                             ) : (
                               <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-100">
                                 <button 
                                   onClick={() => setProcureItems(prev => prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))} 
                                   className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-sky-500"
                                 >
                                   <Plus size={10} />
                                 </button>
                                 <span className="text-[10px] font-black w-5 text-center">{item.quantity}</span>
                                 <button 
                                   onClick={() => setProcureItems(prev => prev.map(i => i._id === item._id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} 
                                   className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-rose-500"
                                 >
                                   <Minus size={10} />
                                 </button>
                                </div>
                             )}
                             <button 
                               onClick={() => setProcureItems(prev => prev.filter(i => i._id !== item._id))}
                               className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                             >
                               <Trash2 size={isSheet ? 14 : 18} />
                             </button>
                          </div>
                        </div>
                      );
                    })
                   )}
                </div>

                <div className="p-3 bg-slate-50/50 border-t border-slate-200 space-y-2">
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gross Bill</span>
                      <span className="text-xl font-black text-slate-900 tracking-tighter">₹{parseFloat(totalAmount.toFixed(2)).toLocaleString()}</span>
                   </div>

                   <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'ONLINE', label: 'Direct Pay', icon: <Banknote size={12} />, color: 'sky' },
                        { id: 'PARTIAL', label: 'Split Pay', icon: <Scan size={12} />, color: 'amber' },
                        { id: 'CREDIT', label: 'On Account', icon: <AlertCircle size={12} />, color: 'rose' }
                      ].map(method => (
                        <button 
                          key={method.id}
                          onClick={() => {
                            setPaymentMethod(method.id);
                            setShowPartialInput(method.id === 'PARTIAL');
                            setConfirmedPayment(null);
                            if (method.id === 'ONLINE') handleOnlineOrderInit();
                          }}
                          className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-1 border ${paymentMethod === method.id ? `bg-${method.color}-500 text-white border-${method.color}-500 shadow-md` : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                        >
                           {method.icon} {method.label}
                        </button>
                      ))}
                   </div>

                   {paymentMethod === 'PARTIAL' && !confirmedPayment && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                         <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest leading-none">Initialization Deposit</p>
                         <div className="flex gap-2">
                            <input 
                              type="number" 
                              placeholder="0.00"
                              className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-black outline-none focus:border-sky-500 transition-all"
                              value={partialAmount}
                              onChange={e => setPartialAmount(e.target.value)}
                            />
                            <button 
                              onClick={handlePartialOrderInit}
                              className="px-4 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-black transition-all"
                            >Initialize</button>
                         </div>
                      </div>
                    )}

                    {confirmedPayment && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between animate-in zoom-in-95">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-100">
                            <CheckCircle2 size={12} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">Receipt Logged</p>
                            <p className="text-sm font-black text-emerald-700 tracking-tighter">₹{confirmedPayment.amount}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setConfirmedPayment(null)}
                          className="w-7 h-7 bg-white text-emerald-500 hover:text-rose-500 rounded-lg flex items-center justify-center transition-all border border-emerald-100"
                        >
                          <Trash2 size={12} />
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
                      className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-md transition-all flex items-center justify-center gap-2 ${((paymentMethod === 'ONLINE' || paymentMethod === 'PARTIAL') && !confirmedPayment) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-sky-600 hover:scale-[1.01] active:scale-95 shadow-sky-100/20'}`}
                    >
                       {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
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
