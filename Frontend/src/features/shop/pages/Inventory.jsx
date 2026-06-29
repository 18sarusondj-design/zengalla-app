import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { Search, Plus, AlertCircle, TrendingUp, ClipboardCheck, X, XCircle, Upload, Pencil, Trash2, Scan, CheckCircle2, Zap, Download as DownloadIcon, Eye, RotateCcw, ChevronRight, ChevronDown, Loader2, Filter, ChevronUp, ChevronLeft, Circle, Sparkles } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import Pagination from '../../common/components/Pagination';

const Inventory = () => {
  const { products, createProduct, updateProduct, deleteProduct, deleteCategory, vendorShop, fetchVendorShop, fetchData } = useStore();
  const { user, token } = useAuth();

  // -- Auto-Fetch Shop if missing --
  useEffect(() => {
    if (token) {
      if (!vendorShop) fetchVendorShop();
      fetchData(); // Trigger full data fetch for inventory
    }
  }, [token, vendorShop, fetchVendorShop, fetchData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showBulkInstructions, setShowBulkInstructions] = useState(false);
  const [bulkLang, setBulkLang] = useState('english');
  const [bulkFile, setBulkFile] = useState(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState('INFO'); // 'INFO' or 'STOCK'
  const [imageFit, setImageFit] = useState('cover'); // 'cover' or 'contain'
  const [imagePositions, setImagePositions] = useState(['50% 50%', '50% 50%', '50% 50%']);
  const [imageZooms, setImageZooms] = useState([100, 100, 100]);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageFiles, setImageFiles] = useState([]); // Array of File objects
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Performance optimization for dragging
  const editorImgRef = useRef(null);
  const isDragging = useRef(false);

  // Memoized Object URLs to prevent lag/memory leaks
  const [previewUrls, setPreviewUrls] = useState([]);
  useEffect(() => {
    const urls = imageFiles.map(file => file ? URL.createObjectURL(file) : null);
    setPreviewUrls(urls);
    return () => urls.forEach(url => url && URL.revokeObjectURL(url));
  }, [imageFiles]);

  const getImgSrc = (idx) => {
    if (previewUrls[idx]) return previewUrls[idx];
    if (newProduct.images && newProduct.images[idx]) return newProduct.images[idx];
    return null;
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const initialProductState = {
    name: '', description: '', price: '', mrp: '', unit: 'Unit', taxRate: 0,
    category: 'General', stockQuantity: '', barcode: '', lowStockThreshold: 5, sellingType: 'piece',
    wholesalePrice: '', businessPrice: '', weightPerUnit: '', unitType: 'GM', minimumOrderQuantity: 1,
    batches: []
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newProduct, setNewProduct] = useState(initialProductState);
  const [showBatches, setShowBatches] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batchNumber: '', mfd: '', expiryDate: '', stock: '', price: '', supplierName: '', warehouseLocation: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // -- Promote Product to Banner states --
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promotingProduct, setPromotingProduct] = useState(null);
  const [vendorBanners, setVendorBanners] = useState([]);
  const [selectedBannerId, setSelectedBannerId] = useState('');
  const [isPromoteSubmitting, setIsPromoteSubmitting] = useState(false);

  const handleOpenPromoteModal = async (product) => {
    setPromotingProduct(product);
    setSelectedBannerId('');
    setIsPromoteModalOpen(true);
    try {
      const { data } = await api.get('/banners/my');
      if (data?.success) {
        const now = new Date();
        const activeBanners = (data.banners || []).filter(b => b.isActive && new Date(b.endDate) >= now);
        setVendorBanners(activeBanners);
        if (activeBanners.length > 0) {
          setSelectedBannerId(activeBanners[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load active banners');
    }
  };

  const handlePromoteProductSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBannerId) return toast.error('Please select a banner');
    if (!promotingProduct) return;

    setIsPromoteSubmitting(true);
    try {
      const { data } = await api.post(`/banners/${selectedBannerId}/products`, {
        productId: promotingProduct._id || promotingProduct.id
      });
      if (data?.success) {
        toast.success(`Successfully added ${promotingProduct.name} to banner!`);
        setIsPromoteModalOpen(false);
        fetchData(); // Sync products
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to promote product to banner');
    } finally {
      setIsPromoteSubmitting(false);
    }
  };

  const performAutoFill = async () => {
    const loadingToast = toast.loading('Searching Master Catalog...');
    try {
      const { data } = await api.get(`/master-products/search?barcode=${newProduct.barcode}`);
      if (data.success && data.product) {
        toast.success('Product found in Master Catalog!', { id: loadingToast });
        const p = data.product;
        setNewProduct(prev => ({
          ...prev,
          name: prev.name || p.name || '',
          description: prev.description || p.description || '',
          category: prev.category === 'General' ? (p.category || 'General') : (prev.category || p.category || 'General'),
          taxRate: prev.taxRate || p.taxRate || 0,
          unit: prev.unit === 'Unit' ? (p.unit || 'Unit') : (prev.unit || p.unit || 'Unit'),
          sellingType: prev.sellingType === 'piece' ? (p.sellingType || 'piece') : (prev.sellingType || p.sellingType || 'piece')
        }));
        
        if (p.imageUrl) {
          setNewProduct(prev => {
            const newImages = [...(prev.images || [])];
            if (!newImages[0]) newImages[0] = p.imageUrl;
            else if (!newImages[1]) newImages[1] = p.imageUrl;
            else if (!newImages[2]) newImages[2] = p.imageUrl;
            return { ...prev, images: newImages };
          });
        }
      } else {
        toast.error('Product not found in Master Catalog', { id: loadingToast });
      }
    } catch (err) {
      toast.error('Failed to search Master Catalog', { id: loadingToast });
    }
  };

  const submitBulkImport = async (autoFill) => {
    if (!bulkFile) return toast.error('Please select an Excel or CSV file first');
    setIsBulkSubmitting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          
          if (!json || json.length === 0) throw new Error('File is empty or invalid format');

          const mappedProducts = json.map(row => ({
            name: row['Name'] || '',
            barcode: row['Barcode'] || '',
            description: row['Description'] || '',
            mrp: Number(row['MRP']) || 0,
            price: Number(row['Selling Price']) || 0,
            wholesalePrice: Number(row['B2B Wholesale Price']) || 0,
            businessPrice: Number(row['B2B Business Price']) || 0,
            stock: Number(row['Stock']) || 0,
            category: row['Category'] || 'General',
            taxRate: Number(row['GST Rate']) || 0,
            sellingType: row['Unit Type (e.g., piece/weight)'] || 'piece',
            unit: row['Unit Label'] || 'Unit'
          }));

          const loadingToast = toast.loading('Uploading items to server...');
          const response = await api.post('/products/bulk', { products: mappedProducts, autoFill });
          
          if (response.data.success) {
            toast.success(`Successfully added ${response.data.count} items!`, { id: loadingToast });
            setIsBulkModalOpen(false);
            setBulkFile(null);
            fetchData();
          }
        } catch (err) {
          toast.error(err.response?.data?.error || err.message || 'Failed to process file');
        } finally {
          setIsBulkSubmitting(false);
        }
      };
      reader.readAsArrayBuffer(bulkFile);
    } catch (err) {
      toast.error('Failed to read file');
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkImport = async (autoFill) => {
    if (autoFill && !vendorShop?.masterCatalogEnabled) {
      try {
        const { data: orderData } = await api.post('/admin-payments/create-order', {
          amount: 999,
          type: 'MASTER_CATALOG_UNLOCK'
        });
        if (!orderData.success) throw new Error('Failed to create order');

        const options = {
          key: orderData.order?.key_id || orderData.key,
          amount: orderData.order?.amount || orderData.amount,
          currency: orderData.order?.currency || orderData.currency,
          name: "Master Catalog Unlock",
          description: "One-time payment to unlock Master Catalog Auto-Fill",
          order_id: orderData.order?.id || orderData.orderId,
          handler: async (response) => {
            try {
              const { data: verifyData } = await api.post('/admin-payments/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                shopId: vendorShop._id
              });
              if (verifyData.success) {
                toast.success('Master Catalog Unlocked!');
                fetchVendorShop();
                submitBulkImport(true);
              }
            } catch (err) {
              toast.error('Payment verification failed');
            }
          },
          prefill: { name: user?.name, email: user?.email, contact: user?.phone },
          theme: { color: "#0EA5E9" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Payment initialization failed. Ensure Super Admin has configured Razorpay keys.');
      }
      return;
    }
    
    // If it's free or already paid, we MUST have a file to proceed.
    if (!bulkFile) return toast.error('Please select an Excel or CSV file first');
    submitBulkImport(autoFill);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      'Name': 'Parle G Gold', 'Barcode': '8901719266155', 'Description': 'Biscuits', 
      'MRP': '20', 'Selling Price': '18', 'B2B Wholesale Price': '15', 'B2B Business Price': '16', 
      'Stock': '50', 'Category': 'Snacks', 'GST Rate': '18', 'Unit Type (e.g., piece/weight)': 'piece', 'Unit Label': 'Pack'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Zengalla_Inventory_Template.xlsx");
  };

  const handleAutoFill = async () => {
    if (!newProduct.barcode) {
      return toast.error('Enter a barcode first');
    }
    
    if (!vendorShop?.masterCatalogEnabled) {
      try {
        const { data: orderData } = await api.post('/admin-payments/create-order', {
          amount: 999,
          type: 'MASTER_CATALOG_UNLOCK'
        });
        if (!orderData.success) throw new Error('Failed to create order');

        const options = {
          key: orderData.order?.key_id || orderData.key,
          amount: orderData.order?.amount || orderData.amount,
          currency: orderData.order?.currency || orderData.currency,
          name: "Master Catalog Unlock",
          description: "One-time payment to unlock Master Catalog Auto-Fill",
          order_id: orderData.order?.id || orderData.orderId,
          handler: async (response) => {
            try {
              const { data: verifyData } = await api.post('/admin-payments/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                shopId: vendorShop._id
              });
              
              if (verifyData.success) {
                toast.success('Master Catalog Unlocked!');
                fetchVendorShop();
                performAutoFill();
              }
            } catch (err) {
              toast.error('Payment verification failed');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone
          },
          theme: { color: "#0EA5E9" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Payment initialization failed. Ensure Super Admin has configured Razorpay keys.');
      }
      return;
    }

    performAutoFill();
  };

  const shopProducts = products.filter(p => {
    const pShopId = (p.shopId?._id || p.shopId || p.shop_id?._id || p.shop_id || '').toString();
    const vShopId = (vendorShop?._id || vendorShop?.id || '').toString();
    return pShopId === vShopId;
  });

  const stats = {
    total: shopProducts.length,
    outOfStock: shopProducts.filter(p => Number(p.stockQuantity || p.stock) <= 0).length,
    lowStock: shopProducts.filter(p => {
      const stock = Number(p.stockQuantity || p.stock || 0);
      const threshold = Number(p.low_stock_threshold || p.lowStockThreshold || 5);
      return stock > 0 && stock <= threshold;
    }).length,
    expired: shopProducts.filter(p => p.batches?.some(b => new Date(b.expiryDate) < new Date())).length,
    nearExpiry: shopProducts.filter(p => p.batches?.some(b => {
      const diff = new Date(b.expiryDate) - new Date();
      return diff > 0 && diff < (5 * 24 * 60 * 60 * 1000); // 5 days
    })).length,
    value: shopProducts.reduce((acc, p) => acc + (p.price * (p.stockQuantity || p.stock || 0)), 0)
  };

  const dynamicCategories = [...new Set(['General', ...shopProducts.map(p => p.category).filter(Boolean)])];

  const filteredProducts = useMemo(() => {
    let list = shopProducts
      .filter(p => (filterCategory === 'All' ? true : p.category === filterCategory))
      .filter(p => {
        if (statusFilter === 'Low Stock') {
          const stock = Number(p.stockQuantity || p.stock || 0);
          const threshold = Number(p.lowStockThreshold || p.low_stock_threshold || 5);
          return stock <= threshold;
        }
        if (statusFilter === 'Expired') {
          return p.batches?.some(b => new Date(b.expiryDate) < new Date());
        }
        if (statusFilter === 'Near Expiry') {
          return p.batches?.some(b => {
            const diff = new Date(b.expiryDate) - new Date();
            return diff > 0 && diff < (5 * 24 * 60 * 60 * 1000);
          });
        }
        if (statusFilter === 'Incomplete') {
          return !p.price || !p.mrp || p.price <= 0 || (p.stockQuantity > 0 && p.batches?.length === 0) || p.batches?.some(b => !b.expiryDate || !b.batchNumber);
        }
        if (statusFilter === 'No Image') {
          return !p.images || p.images.length === 0 || !p.images[0] || p.images[0].trim() === '';
        }
        return true;
      });

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    const matched = list.filter(p => {
      return p.name.toLowerCase().includes(query) || 
             (p.barcode || '').includes(query);
    });

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
  }, [shopProducts, filterCategory, statusFilter, searchQuery]);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [logs, setLogs] = useState([]);
  const [showLogsFor, setShowLogsFor] = useState(null);

  const fetchLogs = async (productId) => {
    try {
      const { data } = await api.get(`/products/${productId}/logs`);
      setLogs(data.logs || []);
    } catch { setLogs([]); }
  };

  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const productData = {
      ...newProduct,
      imageSettings: imagePositions.map((pos, i) => ({
        position: pos,
        zoom: imageZooms[i]
      }))
    };

    let result;
    if (editingId) {
      result = await updateProduct(editingId, productData, imageFiles);
    } else {
      result = await createProduct(productData, imageFiles);
    }

    if (result.success) {
      fetchData(); 
      setIsModalOpen(false);
      setEditingId(null);
      setImageFiles([]);
      setActiveImageIndex(0);
      setImagePositions(['50% 50%', '50% 50%', '50% 50%']);
      setImageZooms([100, 100, 100]);
      setNewProduct(initialProductState);
      setNewCategoryInput('');
      setShowNewCategory(false);
      setIsCategoryOpen(false);
    }
    setIsSubmitting(false);
  };

  const downloadExcel = (type) => {
    let dataToExport = [];
    let filename = '';

    if (type === 'ZERO') {
      dataToExport = shopProducts.filter(p => Number(p.stockQuantity || p.stock || 0) <= 0);
      filename = 'Out_of_Stock_Products.xlsx';
    } else if (type === 'LOW') {
      dataToExport = shopProducts.filter(p => {
        const stock = Number(p.stockQuantity || p.stock || 0);
        const threshold = Number(p.lowStockThreshold || p.low_stock_threshold || 5);
        return stock > 0 && stock <= threshold;
      });
      filename = 'Low_Stock_Products.xlsx';
    } else {
      dataToExport = shopProducts;
      filename = 'All_Products_Inventory.xlsx';
    }

    if (dataToExport.length === 0) return toast.error("No products to export");

    const formattedData = dataToExport.map(p => ({
      'Barcode': p.barcode || 'N/A',
      'Product Name': p.name,
      'Quantity': p.stockQuantity || p.stock || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    
    const max_widths = {};
    formattedData.forEach(row => {
      Object.keys(row).forEach(key => {
        const value = row[key] ? row[key].toString() : '';
        max_widths[key] = Math.max(max_widths[key] || key.length, value.length);
      });
    });
    worksheet['!cols'] = Object.keys(max_widths).map(key => ({ wch: max_widths[key] + 2 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, filename);
    toast.success(`${filename} generated successfully`);
  };

  return (
    <div className="flex flex-col md:h-screen md:overflow-hidden min-h-screen p-2 md:p-4 bg-slate-50">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-end gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock Management</h1>
          <p className="text-gray-500 text-xs mt-1">Review and update your current product catalog.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              fetchData();
              toast.success("Inventory refreshed");
            }}
            className="w-11 h-11 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm active:scale-90"
            title="Refresh Inventory"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <Upload size={20} /> Bulk Import
          </button>
          <button onClick={() => { 
            setEditingId(null); 
            setNewProduct(initialProductState);
            setIsModalOpen(true); 
            setModalMode('INFO');
            setImagePositions(['center', 'center', 'center']);
            setImageZooms([100, 100, 100]);
          }} className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all"><Plus size={20} /> Add Product</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 flex-1 min-h-0 md:overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0 md:overflow-y-auto custom-scrollbar pb-4 lg:pb-0">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-[28px] p-5 shadow-lg shadow-sky-100 flex items-center justify-between group hover:scale-[1.02] transition-all">
              <div>
                <h2 className="text-2xl font-black text-white mb-0.5">{stats.total.toLocaleString()}</h2>
                <p className="text-[9px] font-black text-sky-100 uppercase tracking-widest">Total Products</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm">
                <Scan size={22} strokeWidth={2.5} />
              </div>
            </div>

            {(() => {
              const hasZero = stats.outOfStock > 0;
              const hasLow = stats.lowStock > 0;
              const hasItems = hasZero || hasLow;
              
              let animClass = '';
              let bgClass = 'bg-gray-50 border border-gray-100 shadow-none opacity-60';
              
              if (hasZero && hasLow) {
                animClass = 'animate-blink-red-orange';
                bgClass = 'text-white shadow-amber-200/50';
              } else if (hasZero) {
                animClass = 'animate-blink-red-orange';
                bgClass = 'text-white shadow-rose-200/50';
              } else if (hasLow) {
                animClass = 'animate-blink-orange';
                bgClass = 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-200/50';
              }

              return (
                <div className={`rounded-[28px] p-5 shadow-lg flex flex-col group hover:scale-[1.02] transition-all relative overflow-hidden ${bgClass} ${animClass}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black ${hasItems ? 'text-white' : 'text-gray-400'}`}>{stats.outOfStock}</span>
                          <span className={`text-[8px] font-black uppercase ${hasItems ? 'text-white/60' : 'text-gray-400'}`}>Zero</span>
                        </div>
                        <div className="w-[1px] h-3 bg-white/20 mx-1" />
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black ${hasItems ? 'text-white' : 'text-gray-400'}`}>{stats.lowStock}</span>
                          <span className={`text-[8px] font-black uppercase ${hasItems ? 'text-white/60' : 'text-gray-400'}`}>Low</span>
                        </div>
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${hasItems ? 'text-white/80' : 'text-gray-400'}`}>Inventory Alerts</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm ${hasItems ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-300'}`}>
                      <AlertCircle size={22} strokeWidth={2.5} />
                    </div>
                  </div>

                  {hasItems && (
                    <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-white/20">
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadExcel('ZERO'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[8px] uppercase tracking-tighter transition-all border border-white/10"
                        title="Export Zero Stock"
                      >
                        <DownloadIcon size={10} /> Zero
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadExcel('LOW'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[8px] uppercase tracking-tighter transition-all border border-white/10"
                        title="Export Low Stock"
                      >
                        <DownloadIcon size={10} /> Low
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadExcel('ALL'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[8px] uppercase tracking-tighter transition-all border border-white/10"
                        title="Export All List"
                      >
                        <DownloadIcon size={10} /> All
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className={`rounded-[28px] p-5 shadow-lg flex items-center justify-between group hover:scale-[1.02] transition-all relative overflow-hidden ${stats.expired > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-200/50 animate-bounce-subtle' : 'bg-gray-50 border border-gray-100 shadow-none opacity-60'}`}>
              {stats.expired > 0 && (
                <div className="absolute top-0 right-0 p-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                </div>
              )}
              <div>
                <h2 className={`text-2xl font-black mb-0.5 ${stats.expired > 0 ? 'text-white' : 'text-gray-400'}`}>{stats.expired}</h2>
                <p className={`text-[9px] font-black uppercase tracking-widest ${stats.expired > 0 ? 'text-rose-100' : 'text-gray-400'}`}>Expired Items</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm ${stats.expired > 0 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-300'}`}>
                <XCircle size={22} strokeWidth={2.5} />
              </div>
            </div>

            <div className={`rounded-[28px] p-5 shadow-lg flex items-center justify-between group hover:scale-[1.02] transition-all relative overflow-hidden ${stats.nearExpiry > 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-200/50' : 'bg-gray-50 border border-gray-100 shadow-none opacity-60'}`}>
              {stats.nearExpiry > 0 && (
                <div className="absolute top-0 right-0 p-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" />
                </div>
              )}
              <div>
                <h2 className={`text-2xl font-black mb-0.5 ${stats.nearExpiry > 0 ? 'text-white' : 'text-gray-400'}`}>{stats.nearExpiry}</h2>
                <p className={`text-[9px] font-black uppercase tracking-widest ${stats.nearExpiry > 0 ? 'text-indigo-100' : 'text-gray-400'}`}>Expiring Soon</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm ${stats.nearExpiry > 0 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-300'}`}>
                <Zap size={22} strokeWidth={2.5} className={stats.nearExpiry > 0 ? 'animate-pulse' : ''} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-sm group hover:border-emerald-200 transition-all mt-2">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 text-center">Live Inventory Value</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[10px] font-black text-emerald-500">₹</span>
                <span className="text-2xl font-black text-gray-900 tracking-tighter">{stats.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-50 rounded-full h-1 mt-4 overflow-hidden">
                <div className="bg-emerald-500 h-full w-[65%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 md:overflow-hidden">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-gray-50/50">
              <div className="relative w-full sm:max-w-xs md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  className="w-full bg-white border-2 border-sky-100 focus:border-sky-500/40 rounded-xl py-2 pl-10 pr-4 text-sm outline-none font-bold shadow-sm transition-all" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                <select 
                  className="flex-1 sm:flex-initial border border-gray-200 rounded-xl px-3 py-2 text-xs font-black bg-white uppercase tracking-widest outline-none" 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  {['All', ...dynamicCategories].map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Desktop Status Filter (Buttons) */}
                <div className="hidden md:flex bg-white border border-gray-100 rounded-xl p-1 gap-1">
                  {['All', 'Low Stock', 'Expired', 'Near Expiry', 'Incomplete', 'No Image'].map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-sky-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Mobile Status Filter (Dropdown) */}
                <select
                  className="flex-1 sm:hidden border border-gray-200 rounded-xl px-3 py-2 text-xs font-black bg-white uppercase tracking-widest outline-none"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Expired">Expired</option>
                  <option value="Near Expiry">Near Expiry</option>
                  <option value="Incomplete">Incomplete Data</option>
                  <option value="No Image">No Image</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Product Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Barcode</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Price</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Quantity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Logistics / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedProducts.map((p) => {
                    const stock = Number(p.stockQuantity || p.stock || 0);
                    const threshold = Number(p.low_stock_threshold || p.lowStockThreshold || 5);
                    const isOutOfStock = stock <= 0;
                    const isLowStock = stock <= threshold;

                    return (
                      <tr key={p._id || p.id} className="hover:bg-sky-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 group-hover:shadow-md transition-all relative">
                              {p.imageUrl || p.image || (p.images && p.images[0]) ? (
                                <img 
                                  src={p.imageUrl || p.image || p.images[0]} 
                                  alt={p.name} 
                                  className="w-full h-full object-cover transition-all" 
                                  style={{
                                    objectPosition: p.imageSettings?.[0]?.position || '50% 50%',
                                    transform: `scale(${(p.imageSettings?.[0]?.zoom || 100) / 100})`,
                                    transformOrigin: p.imageSettings?.[0]?.position || '50% 50%'
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Zap size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 leading-tight">{p.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-gray-400 font-mono tracking-wider">
                            {p.barcode || '---'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-gray-900">₹{p.price}</span>
                            {p.mrp && p.mrp > p.price && (
                              <span className="text-[10px] font-bold text-gray-300 line-through">₹{p.mrp}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isOutOfStock ? 'bg-rose-50 text-rose-500' :
                            isLowStock ? 'bg-amber-50 text-amber-500' :
                              'bg-emerald-50 text-emerald-500'
                            }`}>
                            {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[11px] font-bold uppercase ${isOutOfStock ? 'text-rose-500 italic' : 'text-gray-600'}`}>
                            {isOutOfStock ? 'STOCK ENDED' : (p.sellingType === 'weight' || p.selling_type === 'weight' ? `${stock.toFixed(2)} KG` : `${stock} PKT`)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setShowLogsFor(p);
                                  fetchLogs(p._id || p.id);
                                }}
                                className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-emerald-500 hover:border-emerald-200 hover:shadow-sm transition-all flex items-center justify-center"
                                title="History"
                              >
                                <TrendingUp size={16} />
                              </button>
                            <button
                              onClick={() => {
                                setEditingId(p._id || p.id);
                                setNewProduct({
                                  ...p,
                                  stockQuantity: p.stockQuantity ?? p.stock ?? '',
                                  lowStockThreshold: p.lowStockThreshold ?? p.low_stock_threshold ?? 5,
                                  wholesalePrice: p.wholesalePrice ?? p.wholesale_price ?? '',
                                  businessPrice: p.businessPrice ?? p.business_price ?? '',
                                  weightPerUnit: p.weightPerUnit ?? p.weight_per_unit ?? '',
                                  unitType: p.unitType ?? p.unit_type ?? 'GM',
                                  minimumOrderQuantity: p.minimumOrderQuantity ?? p.minimum_order_quantity ?? 1,
                                  taxRate: p.taxRate ?? p.tax_rate ?? 0,
                                  sellingType: p.sellingType ?? p.selling_type ?? 'piece',
                                  description: p.description ?? '',
                                  batches: p.batches || [],
                                  images: p.images || [p.image].filter(Boolean)
                                });
                                setImagePositions(p.imageSettings?.map(s => s.position || '50% 50%') || ['50% 50%', '50% 50%', '50% 50%']);
                                setImageZooms(p.imageSettings?.map(s => s.zoom || 100) || [100, 100, 100]);
                                setIsModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-sky-500 hover:border-sky-200 hover:shadow-sm transition-all flex items-center justify-center"
                            >
                              <Eye size={16} />
                            </button>
                            {vendorShop?.bannersEnabled && (
                              <button
                                onClick={() => handleOpenPromoteModal(p)}
                                className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-amber-500 hover:border-amber-200 hover:shadow-sm transition-all flex items-center justify-center"
                                title="Promote Product"
                              >
                                <Sparkles size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                toast("Delete this product?", {
                                  description: "This action cannot be undone.",
                                  action: {
                                    label: "Delete",
                                    onClick: () => deleteProduct(p._id || p.id),
                                  },
                                  cancel: {
                                    label: "Cancel",
                                    onClick: () => { },
                                  }
                                });
                              }}
                              className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:shadow-sm transition-all flex items-center justify-center"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <ClipboardCheck size={48} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">No products found</p>
                </div>
              )}
            </div>

            {/* Mobile Card List (Visible only on mobile) */}
            <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
              {paginatedProducts.map((p) => {
                const stock = Number(p.stockQuantity || p.stock || 0);
                const threshold = Number(p.low_stock_threshold || p.lowStockThreshold || 5);
                const isOutOfStock = stock <= 0;
                const isLowStock = stock <= threshold;

                return (
                  <div 
                    key={p._id || p.id} 
                    className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm space-y-3 relative hover:shadow-md transition-all group"
                  >
                    {/* Header: Image & Name & Category */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 relative">
                        {p.imageUrl || p.image || (p.images && p.images[0]) ? (
                          <img 
                            src={p.imageUrl || p.image || p.images[0]} 
                            alt={p.name} 
                            className="w-full h-full object-cover" 
                            style={{
                              objectPosition: p.imageSettings?.[0]?.position || '50% 50%',
                              transform: `scale(${(p.imageSettings?.[0]?.zoom || 100) / 100})`,
                              transformOrigin: p.imageSettings?.[0]?.position || '50% 50%'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Zap size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest leading-none block mb-1">{p.category || 'General'}</span>
                        <h4 className="text-sm font-black text-gray-900 leading-snug truncate">{p.name}</h4>
                        <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider block mt-1">
                          Barcode: {p.barcode || '---'}
                        </span>
                      </div>
                    </div>

                    {/* Stock Status & Quantity & Pricing Info */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50 text-xs">
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Price</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-gray-900">₹{p.price}</span>
                          {p.mrp && p.mrp > p.price && (
                            <span className="text-[10px] font-bold text-gray-300 line-through">₹{p.mrp}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Inventory</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-black uppercase ${isOutOfStock ? 'text-rose-500 italic' : 'text-gray-700'}`}>
                            {isOutOfStock ? 'OUT OF STOCK' : (p.sellingType === 'weight' || p.selling_type === 'weight' ? `${stock.toFixed(2)} KG` : `${stock} PKT`)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isOutOfStock ? 'bg-rose-50 text-rose-500' :
                            isLowStock ? 'bg-amber-50 text-amber-500' :
                              'bg-emerald-50 text-emerald-500'
                            }`}>
                            {isOutOfStock ? 'OUT' : isLowStock ? 'LOW' : 'OK'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50">
                      {/* Logs / History Button */}
                      <button
                        onClick={() => {
                          setShowLogsFor(p);
                          fetchLogs(p._id || p.id);
                        }}
                        type="button"
                        className="h-9 px-3 rounded-xl bg-gray-50 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                        title="History"
                      >
                        <TrendingUp size={12} />
                        <span>History</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setEditingId(p._id || p.id);
                          setNewProduct({
                            ...p,
                            stockQuantity: p.stockQuantity ?? p.stock ?? '',
                            lowStockThreshold: p.lowStockThreshold ?? p.low_stock_threshold ?? 5,
                            wholesalePrice: p.wholesalePrice ?? p.wholesale_price ?? '',
                            businessPrice: p.businessPrice ?? p.business_price ?? '',
                            weightPerUnit: p.weightPerUnit ?? p.weight_per_unit ?? '',
                            unitType: p.unitType ?? p.unit_type ?? 'GM',
                            minimumOrderQuantity: p.minimumOrderQuantity ?? p.minimum_order_quantity ?? 1,
                            taxRate: p.taxRate ?? p.tax_rate ?? 0,
                            sellingType: p.sellingType ?? p.selling_type ?? 'piece',
                            description: p.description ?? '',
                            batches: p.batches || [],
                            images: p.images || [p.image].filter(Boolean)
                          });
                          setImagePositions(p.imageSettings?.map(s => s.position || '50% 50%') || ['50% 50%', '50% 50%', '50% 50%']);
                          setImageZooms(p.imageSettings?.map(s => s.zoom || 100) || [100, 100, 100]);
                          setIsModalOpen(true);
                        }}
                        type="button"
                        className="h-9 px-3 rounded-xl bg-gray-50 text-gray-500 hover:text-sky-500 hover:bg-sky-50 transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                      >
                        <Eye size={12} />
                        <span>Edit</span>
                      </button>

                      {/* Promote Button */}
                      {vendorShop?.bannersEnabled && (
                        <button
                          onClick={() => handleOpenPromoteModal(p)}
                          type="button"
                          className="w-9 h-9 rounded-xl bg-gray-50 text-gray-500 hover:text-amber-500 hover:bg-amber-50 transition-all flex items-center justify-center shrink-0"
                          title="Promote Product"
                        >
                          <Sparkles size={12} />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => {
                          toast("Delete this product?", {
                            description: "This action cannot be undone.",
                            action: {
                              label: "Delete",
                              onClick: () => deleteProduct(p._id || p.id),
                            },
                            cancel: {
                              label: "Cancel",
                              onClick: () => { },
                            }
                          });
                        }}
                        type="button"
                        className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <ClipboardCheck size={40} strokeWidth={1} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">No products found</p>
                </div>
              )}
            </div>

            {/* Footer Pagination */}
            <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Page {currentPage} of {totalPages}</p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-2 z-[100] backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-[98vw] xl:max-w-7xl shadow-2xl flex flex-col border border-white/20 max-h-[95vh]">
            {/* Modal Header */}
            <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0 rounded-t-[32px]">
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Universal Inventory Identifier</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm">
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            {/* Mode Toggle (Only during edit) */}
            {editingId && (
              <div className="px-6 py-2 bg-white border-b border-gray-50 flex gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalMode('INFO')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalMode === 'INFO' ? 'bg-sky-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Edit Information
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('STOCK')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalMode === 'STOCK' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Quick Stock-In
                </button>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 min-h-0">

              {/* Column 1: Identity & Media */}
              <div className={`space-y-4 flex flex-col ${modalMode === 'STOCK' ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Basic Identity</label>
                  <input
                    type="text"
                    placeholder="Enter product name..."
                    required
                    className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-800 outline-none transition-all shadow-sm"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 flex-none">
                  <div className="flex justify-between items-center ml-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Media Gallery (Up to 3)</label>
                    <span className="text-[10px] font-bold text-sky-500 uppercase">Slot {activeImageIndex + 1}/3</span>
                  </div>
                  
                  {/* Main Preview / Carousel */}
                  <div className="relative group h-44 cursor-pointer overflow-hidden rounded-2xl bg-gray-50 border-2 border-gray-100 shadow-inner">
                    <div 
                      className="w-full h-full flex items-center justify-center relative"
                      onClick={() => {
                        const currentImg = (newProduct.images || [])[activeImageIndex] || imageFiles[activeImageIndex];
                        if (currentImg) setIsLightboxOpen(true);
                        else document.getElementById('product-image-upload').click();
                      }}
                    >
                      {((newProduct.images || [])[activeImageIndex] || imageFiles[activeImageIndex]) ? (
                        <img
                          src={imageFiles[activeImageIndex] ? URL.createObjectURL(imageFiles[activeImageIndex]) : (newProduct.images[activeImageIndex])}
                          className={`w-full h-full ${imageFit === 'cover' ? 'object-cover' : 'object-contain'} transition-all duration-500`}
                          style={{ 
                            objectPosition: imagePositions[activeImageIndex],
                            transform: `scale(${imageZooms[activeImageIndex] / 100})`,
                            transformOrigin: imagePositions[activeImageIndex]
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <Plus size={24} className="mx-auto text-gray-300 mb-1 animate-pulse" />
                          <p className="text-[10px] font-black text-gray-400 uppercase">Add Photo {activeImageIndex + 1}</p>
                        </div>
                      )}

                      {/* Manual Overlay Controls */}
                      <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); document.getElementById('product-image-upload').click(); }}
                          className="bg-white text-sky-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                        >
                          {((newProduct.images || [])[activeImageIndex] || imageFiles[activeImageIndex]) ? 'Replace Photo' : 'Upload Photo'}
                        </button>
                        {((newProduct.images || [])[activeImageIndex] || imageFiles[activeImageIndex]) && (
                          <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all delay-75">
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); setIsCropModalOpen(true); }}
                              className="bg-white/20 hover:bg-white/40 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30"
                            >
                              Adjust
                            </button>
                            <button 
                              type="button" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const newFiles = [...imageFiles];
                                newFiles[activeImageIndex] = null;
                                setImageFiles(newFiles);
                                const newImgs = [...(newProduct.images || [])];
                                newImgs.splice(activeImageIndex, 1);
                                setNewProduct({...newProduct, images: newImgs});
                              }}
                              className="bg-rose-500/80 hover:bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      id="product-image-upload"
                      className="hidden"
                      multiple
                      onChange={e => {
                        const files = Array.from(e.target.files);
                        if (files.length > 0) {
                          const newFiles = [...imageFiles];
                          files.slice(0, 3 - activeImageIndex).forEach((file, i) => {
                            newFiles[activeImageIndex + i] = file;
                          });
                          setImageFiles(newFiles);
                          toast.success(`Selected ${Math.min(files.length, 3)} photos`);
                        }
                      }}
                      accept="image/*"
                    />
                  </div>

                  {/* Thumbnails / Slot Selector */}
                  <div className="flex gap-2 mt-2">
                    {[0, 1, 2].map((idx) => {
                      const img = (newProduct.images || [])[idx] || imageFiles[idx];
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`flex-1 aspect-square rounded-xl border-2 transition-all overflow-hidden ${activeImageIndex === idx ? 'border-sky-500 shadow-md scale-105' : 'border-gray-100 hover:border-gray-200'}`}
                        >
                          {img ? (
                            <img 
                              src={imageFiles[idx] ? URL.createObjectURL(imageFiles[idx]) : img} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                              <Plus size={12} className="text-gray-300" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <button type="button" onClick={() => { setShowNewCategory(v => !v); setIsCategoryOpen(false); }} className="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-1 hover:text-sky-700">
                      <Plus size={9} strokeWidth={3} /> New
                    </button>
                  </div>
                  {showNewCategory ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Category name..."
                        className="flex-1 bg-gray-50 border-2 border-sky-200 rounded-xl py-2 px-3 text-[10px] font-black text-gray-800 outline-none"
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const cat = newCategoryInput.trim();
                            if (cat) { setNewProduct({ ...newProduct, category: cat }); setShowNewCategory(false); setNewCategoryInput(''); }
                          }
                        }}
                      />
                      <button type="button" onClick={() => {
                        const cat = newCategoryInput.trim();
                        if (cat) { setNewProduct({ ...newProduct, category: cat }); setShowNewCategory(false); setNewCategoryInput(''); }
                      }} className="px-3 bg-sky-500 text-white rounded-xl text-[8px] font-black hover:bg-sky-600">Add</button>
                      <button type="button" onClick={() => setShowNewCategory(false)} className="px-2 text-gray-300 hover:text-gray-500"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCategoryOpen(v => !v)}
                        className="w-full bg-gray-50 border-2 border-transparent hover:border-sky-200 rounded-xl py-2.5 px-4 text-[10px] font-black text-gray-800 outline-none transition-all uppercase flex items-center justify-between"
                      >
                        <span>{newProduct.category || 'General'}</span>
                        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isCategoryOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-gray-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                          <div className="max-h-44 overflow-y-auto p-1">
                            {[...new Set([...dynamicCategories, newProduct.category].filter(Boolean))].map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { setNewProduct({ ...newProduct, category: c }); setIsCategoryOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${newProduct.category === c ? 'bg-sky-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>



                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100 mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setNewProduct(prev => ({
                        ...prev,
                        id: undefined,
                        _id: undefined,
                        price: '',
                        mrp: '',
                        stockQuantity: '',
                        barcode: '',
                        wholesalePrice: '',
                        businessPrice: '',
                        weightPerUnit: '',
                        minimumOrderQuantity: 1,
                        batches: []
                      }));
                      toast.info("Branding retained. Please enter new price and stock.");
                    }}
                    className="h-10 bg-sky-500 border-2 border-sky-500 text-white rounded-xl font-black text-[8px] uppercase tracking-widest shadow-sm hover:shadow-xl hover:shadow-sky-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Add Similar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 bg-sky-600 text-white rounded-xl font-black text-[8px] uppercase tracking-widest shadow-xl shadow-sky-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={12} strokeWidth={3} /> Save Item</>}
                  </button>
                </div>
              </div>

              {/* Column 2: Specifics */}
              <div className={`space-y-4 ${modalMode === 'STOCK' ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">GST Rate (%)</label>
                    <select
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/20 focus:bg-white rounded-xl py-2.5 px-4 text-[10px] font-black text-gray-800 outline-none transition-all"
                      value={newProduct.taxRate}
                      onChange={e => setNewProduct({ ...newProduct, taxRate: parseFloat(e.target.value) })}
                    >
                      {[{ l: '0%', v: 0 }, { l: '5%', v: 5 }, { l: '12%', v: 12 }, { l: '18%', v: 18 }, { l: '28%', v: 28 }].map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">SKU / Barcode</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-xl py-2.5 px-4 text-[10px] font-black text-gray-800 outline-none transition-all tracking-widest shadow-sm"
                        value={newProduct.barcode}
                        onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={handleAutoFill}
                        className="bg-emerald-500 text-white rounded-xl px-3 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center whitespace-nowrap shadow-sm"
                      >
                        <Zap size={14} className="mr-1" /> Auto-Fill
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Description</label>
                  <textarea
                    rows="2"
                    className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-800 outline-none transition-all resize-none shadow-sm"
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Selling Unit Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewProduct({ 
                        ...newProduct, 
                        sellingType: 'weight',
                        minimumOrderQuantity: newProduct.sellingType === 'weight' ? newProduct.minimumOrderQuantity : 1.0,
                        lowStockThreshold: newProduct.sellingType === 'weight' ? newProduct.lowStockThreshold : 1.0
                      })}
                      className={`py-2 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${newProduct.sellingType === 'weight' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      KG / Weight Based
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProduct({ 
                        ...newProduct, 
                        sellingType: 'piece',
                        minimumOrderQuantity: newProduct.sellingType === 'piece' ? newProduct.minimumOrderQuantity : 1,
                        lowStockThreshold: newProduct.sellingType === 'piece' ? newProduct.lowStockThreshold : 5
                      })}
                      className={`py-2 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${newProduct.sellingType === 'piece' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Packet Based
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-200/60 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] text-center">
                    {newProduct.sellingType === 'weight' ? 'Stock Details' : 'Packaging Details'}
                  </p>

                  {newProduct.sellingType === 'weight' ? (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Total Stock (KG)</label>
                      <input
                        type="number"
                        className={`w-full bg-white border-2 border-gray-200 rounded-lg py-2.5 px-3 text-sm font-black outline-none shadow-sm ${newProduct.batches?.length > 0 ? 'text-gray-400' : 'text-gray-800 focus:border-sky-300'}`}
                        value={newProduct.stockQuantity}
                        onChange={e => setNewProduct({ ...newProduct, stockQuantity: Math.max(0, parseFloat(e.target.value) || 0) })}
                        min="0"
                        readOnly={newProduct.batches?.length > 0}
                      />
                      {newProduct.batches?.length > 0 && (
                        <p className="text-[10px] text-sky-400 font-black uppercase mt-1 ml-1 tracking-widest">Managed by Batches</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Weight / Packet</label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-white border-2 border-gray-200 focus:border-sky-300 rounded-lg py-2 px-2 pr-12 text-xs font-black text-gray-800 outline-none shadow-sm"
                              value={newProduct.weightPerUnit}
                              onChange={e => setNewProduct({ ...newProduct, weightPerUnit: Math.max(0, parseFloat(e.target.value) || 0) })}
                              min="0"
                            />
                            <select
                              className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-none text-[8px] font-black text-gray-400 outline-none cursor-pointer"
                              value={newProduct.unitType}
                              onChange={e => setNewProduct({ ...newProduct, unitType: e.target.value })}
                            >
                              {['GM', 'KG', 'ML', 'L'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                        <span className="text-gray-300 font-black pb-2">×</span>
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">No. of Packets</label>
                          <input
                            type="number"
                            className={`w-full bg-white border-2 border-gray-200 rounded-lg py-2 px-2 text-xs font-black outline-none shadow-sm ${newProduct.batches?.length > 0 ? 'text-gray-400' : 'text-gray-800 focus:border-sky-300'}`}
                            value={newProduct.stockQuantity}
                            onChange={e => setNewProduct({ ...newProduct, stockQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                            min="0"
                            readOnly={newProduct.batches?.length > 0}
                          />
                        </div>
                      </div>
                      {newProduct.batches?.length > 0 && (
                        <p className="text-[10px] text-sky-400 font-black uppercase mt-0.5 ml-1 tracking-widest">Managed by Batches</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Column 3: Pricing */}
              <div className={`space-y-4 ${modalMode === 'STOCK' ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Retail Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">MRP</label>
                      <input
                        type="number"
                        className="w-full bg-white border-2 border-gray-200 focus:border-emerald-500/40 rounded-lg py-2 px-2 text-xs font-black text-gray-800 outline-none shadow-sm"
                        value={newProduct.mrp}
                        onChange={e => setNewProduct({ ...newProduct, mrp: Math.max(0, parseFloat(e.target.value) || 0) })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Selling Price</label>
                      <input
                        type="number"
                        className="w-full bg-white border-2 border-gray-200 focus:border-emerald-500/40 rounded-lg py-2 px-2 text-xs font-black text-gray-800 outline-none font-sans shadow-sm"
                        value={newProduct.price}
                        onChange={e => setNewProduct({ ...newProduct, price: Math.max(0, parseFloat(e.target.value) || 0) })}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-200/60 rounded-2xl space-y-1.5">
                  <label className="block text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] ml-1">Wholesale Pricing</label>
                  <input
                    type="number"
                    className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-lg py-2 px-3 text-xs font-black text-gray-800 outline-none transition-all shadow-sm"
                    value={newProduct.wholesalePrice}
                    onChange={e => setNewProduct({ ...newProduct, wholesalePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    min="0"
                  />
                </div>

                <div className="p-4 bg-indigo-50/60 border border-indigo-200/60 rounded-2xl space-y-1.5">
                  <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">Business Pricing (GST)</label>
                  <input
                    type="number"
                    className="w-full bg-white border-2 border-gray-200 focus:border-indigo-500/40 rounded-lg py-2 px-3 text-xs font-black text-gray-800 outline-none transition-all shadow-sm"
                    value={newProduct.businessPrice}
                    onChange={e => setNewProduct({ ...newProduct, businessPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    min="0"
                  />
                </div>
              </div>

              {/* Column 4: Final Actions */}
              <div className="space-y-4 py-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-2xl space-y-2">
                      <label className="block text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">
                        Min Order Qty {newProduct.sellingType === 'weight' ? '(KG)' : '(PKT)'}
                      </label>
                      <input
                        type="number"
                        step={newProduct.sellingType === 'weight' ? '0.01' : '1'}
                        className="w-full bg-white border border-transparent focus:border-amber-500/20 rounded-lg py-2 px-3 text-xs font-black text-gray-800 outline-none"
                        value={newProduct.minimumOrderQuantity}
                        onChange={e => setNewProduct({ ...newProduct, minimumOrderQuantity: Math.max(newProduct.sellingType === 'weight' ? 0.01 : 1, parseFloat(e.target.value) || 0) })}
                        min={newProduct.sellingType === 'weight' ? '0.01' : '1'}
                      />
                    </div>
                     <div className="p-4 bg-rose-50/60 border border-rose-200/60 rounded-2xl space-y-2">
                       <label className="block text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">
                         Low Stock Alert {newProduct.sellingType === 'weight' ? '(KG)' : '(PKT)'}
                       </label>
                       <input
                         type="number"
                         step={newProduct.sellingType === 'weight' ? '0.01' : '1'}
                         className="w-full bg-white border border-transparent focus:border-rose-500/20 rounded-lg py-2 px-3 text-xs font-black text-gray-800 outline-none"
                         value={newProduct.lowStockThreshold}
                         onChange={e => setNewProduct({ ...newProduct, lowStockThreshold: Math.max(0, parseFloat(e.target.value) || 0) })}
                         min="0"
                       />
                     </div>
                  </div>

                  <div className={`border-t border-gray-100 pt-2 ${modalMode === 'STOCK' ? 'ring-4 ring-emerald-500/20 rounded-2xl p-2 bg-emerald-50/30' : ''}`}>
                    <div 
                      className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl transition-all ${modalMode !== 'STOCK' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                      onClick={() => modalMode !== 'STOCK' && setShowBatches(!showBatches)}
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardCheck size={16} className={modalMode === 'STOCK' ? 'text-emerald-500' : 'text-sky-500'} />
                        <span className={`text-[11px] font-black uppercase tracking-widest ${modalMode === 'STOCK' ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {modalMode === 'STOCK' ? 'Stock-In Active' : 'Batch Management'}
                        </span>
                      </div>
                    </div>

                    {(showBatches || modalMode === 'STOCK') && (
                      <div className="mt-3 space-y-3 p-1 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch No.</label>
                            <input
                              type="text"
                              className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-xl py-2 px-3 text-[10px] font-black uppercase outline-none shadow-sm"
                              value={newBatch.batchNumber}
                              onChange={e => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expiry Date</label>
                            <input
                              type="date"
                              className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-xl py-2 px-3 text-[10px] font-black uppercase outline-none shadow-sm"
                              value={newBatch.expiryDate}
                              onChange={e => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qty</label>
                            <input
                              type="number"
                              className="w-full bg-white border-2 border-gray-200 focus:border-sky-500/40 rounded-xl py-2 px-2 text-[10px] font-black outline-none shadow-sm"
                              value={newBatch.stock}
                              onChange={e => setNewBatch({ ...newBatch, stock: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full bg-white border-2 border-emerald-200 focus:border-emerald-400 rounded-xl py-2 px-2 text-[10px] font-black outline-none shadow-sm"
                              value={newBatch.price}
                              onChange={e => setNewBatch({ ...newBatch, price: e.target.value })}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newBatch.batchNumber || !newBatch.stock) return toast.error("Batch No. and Stock are required");
                            const updatedBatches = [...(newProduct.batches || []), { ...newBatch }];
                            const newTotalStock = updatedBatches.reduce((sum, b) => sum + (parseFloat(b.stock) || 0), 0);
                            setNewProduct({ ...newProduct, batches: updatedBatches, stockQuantity: newTotalStock });
                            setNewBatch({ batchNumber: '', mfd: '', expiryDate: '', stock: '', price: '', supplierName: '', warehouseLocation: '' });

                            toast.success("Batch added to queue");
                          }}
                          className="w-full h-10 bg-sky-50 text-sky-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-100 flex items-center justify-center gap-2 border border-sky-100"
                        >
                          <Plus size={14} /> Add Batch to List
                        </button>

                        {/* Table Queue Display */}
                        {newProduct.batches?.length > 0 && (
                          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                            <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-1">Active Queue ({newProduct.batches.length})</label>
                            <div className="border-2 border-sky-100 rounded-xl overflow-hidden shadow-md bg-white">
                              <div className="max-h-[140px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead className="sticky top-0 bg-sky-50/80 backdrop-blur-sm z-10">
                                    <tr className="border-b border-sky-100">
                                      <th className="px-3 py-2.5 text-[9px] font-black text-sky-700 uppercase tracking-widest">Batch</th>
                                      <th className="px-3 py-2.5 text-[9px] font-black text-sky-700 uppercase tracking-widest">Qty</th>
                                      <th className="px-3 py-2.5 text-[9px] font-black text-sky-700 uppercase tracking-widest">Price</th>
                                      <th className="px-3 py-2.5 text-[9px] font-black text-sky-700 uppercase tracking-widest">Exp</th>
                                      <th className="px-3 py-2.5 text-[9px] font-black text-sky-700 uppercase tracking-widest"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {newProduct.batches.map((batch, idx) => (
                                      <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-sky-50 transition-colors">
                                        <td className="px-3 py-2 text-[11px] font-black text-gray-800 truncate max-w-[60px]">#{batch.batchNumber}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-sky-600">{batch.stock}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-emerald-600">
                                          {batch.price ? `₹${parseFloat(batch.price).toFixed(2)}` : <span className="text-[8px] text-gray-300 uppercase">—</span>}
                                        </td>
                                          <td className="px-3 py-2 text-[10px] font-bold text-gray-500">
                                            {batch.expiryDate ? (
                                              batch.expiryDate.includes('T') 
                                                ? batch.expiryDate.split('T')[0].split('-').reverse().join('/')
                                                : batch.expiryDate.split('-').reverse().join('/')
                                            ) : <span className="text-[8px] text-sky-400/60 uppercase">No Expiry</span>}
                                          </td>
                                        <td className="px-3 py-2 text-right">
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              const updated = newProduct.batches.filter((_, i) => i !== idx);
                                              const newTotalStock = updated.reduce((sum, b) => sum + (parseFloat(b.stock) || 0), 0);
                                              setNewProduct({ ...newProduct, batches: updated, stockQuantity: newTotalStock });
                                              toast.info("Batch removed");
                                            }}
                                            className="text-gray-400 hover:text-rose-600 transition-all p-1 bg-gray-50 hover:bg-rose-50 rounded-lg"
                                          >
                                            <Trash2 size={12} strokeWidth={2.5} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Visual Adjustment / Crop Modal */}
      {isCropModalOpen && ((newProduct.images || [])[activeImageIndex] || imageFiles[activeImageIndex]) && (
        <div className="fixed inset-0 bg-gray-950 flex flex-col z-[400] animate-in fade-in duration-300">
          <div className="p-6 flex justify-between items-center border-b border-white/10 bg-gray-900 shrink-0">
            <button onClick={() => setIsCropModalOpen(false)} className="text-white text-sm font-black uppercase tracking-widest">Cancel</button>
            <h3 className="text-white text-lg font-black uppercase">Edit Composition</h3>
            <button onClick={() => setIsCropModalOpen(false)} className="bg-white text-black px-6 py-2 rounded-full text-sm font-black uppercase">Save</button>
          </div>
          <div className="flex-1 flex flex-col lg:flex-row p-6 gap-8 overflow-hidden">
            <div className="flex-1 bg-black rounded-[40px] relative overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl">
              <div 
                className="relative aspect-square w-full max-w-[500px] overflow-hidden rounded-2xl cursor-crosshair active:cursor-grabbing group shadow-2xl border-2 border-white/10"
                onMouseDown={(e) => { 
                  isDragging.current = true;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  const posString = `${x}% ${y}%`;
                  const newPositions = [...imagePositions];
                  newPositions[activeImageIndex] = posString;
                  setImagePositions(newPositions);
                }}
                onTouchStart={(e) => {
                  isDragging.current = true;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = ((touch.clientX - rect.left) / rect.width) * 100;
                  const y = ((touch.clientY - rect.top) / rect.height) * 100;
                  const posString = `${x}% ${y}%`;
                  const newPositions = [...imagePositions];
                  newPositions[activeImageIndex] = posString;
                  setImagePositions(newPositions);
                }}
                onMouseUp={() => { isDragging.current = false; }}
                onTouchEnd={() => { isDragging.current = false; }}
                onMouseLeave={() => { isDragging.current = false; }}
                onMouseMove={(e) => {
                  if (isDragging.current && editorImgRef.current) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    const posString = `${x}% ${y}%`;
                    editorImgRef.current.style.objectPosition = posString;
                    editorImgRef.current.style.transformOrigin = posString;
                    const newPositions = [...imagePositions];
                    newPositions[activeImageIndex] = posString;
                    setImagePositions(newPositions);
                  }
                }}
                onTouchMove={(e) => {
                  if (isDragging.current && editorImgRef.current) {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    const x = ((touch.clientX - rect.left) / rect.width) * 100;
                    const y = ((touch.clientY - rect.top) / rect.height) * 100;
                    const posString = `${x}% ${y}%`;
                    editorImgRef.current.style.objectPosition = posString;
                    editorImgRef.current.style.transformOrigin = posString;
                    const newPositions = [...imagePositions];
                    newPositions[activeImageIndex] = posString;
                    setImagePositions(newPositions);
                  }
                }}
              >
                {/* Rule of Thirds Grid Overlay */}
                <div className="absolute inset-0 z-20 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 border border-white/20" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                </div>

                <img
                  ref={editorImgRef}
                  src={getImgSrc(activeImageIndex)}
                  className={`w-full h-full ${imageFit === 'cover' ? 'object-cover' : 'object-contain'} transition-none pointer-events-none will-change-transform`}
                  style={{ 
                    objectPosition: imagePositions[activeImageIndex],
                    transform: `scale(${imageZooms[activeImageIndex] / 100})`,
                    transformOrigin: imagePositions[activeImageIndex]
                  }}
                />
              </div>
            </div>
            <div className="w-full lg:w-80 flex flex-col gap-8 p-4 shrink-0">
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Digital Zoom</label>
                    <span className="text-xl font-black text-white">{imageZooms[activeImageIndex]}%</span>
                  </div>
                  <input 
                    type="range" min="100" max="300" step="1"
                    className="w-full accent-sky-500 cursor-pointer h-2"
                    value={imageZooms[activeImageIndex]}
                    onChange={(e) => {
                      const newZooms = [...imageZooms];
                      newZooms[activeImageIndex] = parseInt(e.target.value);
                      setImageZooms(newZooms);
                    }}
                  />
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Precision Framing</label>
                    <div className="flex flex-col items-center gap-1">
                      <button type="button" onClick={() => {
                        const [x, y] = imagePositions[activeImageIndex].split(' ').map(p => parseFloat(p));
                        const newPos = `${x}% ${Math.max(0, y - 5)}%`;
                        const newPositions = [...imagePositions];
                        newPositions[activeImageIndex] = newPos;
                        setImagePositions(newPositions);
                      }} className="w-12 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-sky-500/20"><ChevronUp size={20} /></button>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => {
                          const [x, y] = imagePositions[activeImageIndex].split(' ').map(p => parseFloat(p));
                          const newPos = `${Math.max(0, x - 5)}% ${y}%`;
                          const newPositions = [...imagePositions];
                          newPositions[activeImageIndex] = newPos;
                          setImagePositions(newPositions);
                        }} className="w-12 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-sky-500/20"><ChevronLeft size={20} /></button>
                        <button type="button" onClick={() => {
                          const newPositions = [...imagePositions];
                          newPositions[activeImageIndex] = '50% 50%';
                          setImagePositions(newPositions);
                        }} className="w-12 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-sky-500/30"><Circle size={10} fill="currentColor" /></button>
                        <button type="button" onClick={() => {
                          const [x, y] = imagePositions[activeImageIndex].split(' ').map(p => parseFloat(p));
                          const newPos = `${Math.min(100, x + 5)}% ${y}%`;
                          const newPositions = [...imagePositions];
                          newPositions[activeImageIndex] = newPos;
                          setImagePositions(newPositions);
                        }} className="w-12 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-sky-500/20"><ChevronRight size={20} /></button>
                      </div>
                      <button type="button" onClick={() => {
                        const [x, y] = imagePositions[activeImageIndex].split(' ').map(p => parseFloat(p));
                        const newPos = `${x}% ${Math.min(100, y + 5)}%`;
                        const newPositions = [...imagePositions];
                        newPositions[activeImageIndex] = newPos;
                        setImagePositions(newPositions);
                      }} className="w-12 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-sky-500/20"><ChevronDown size={20} /></button>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-sky-500/5 rounded-3xl border border-sky-500/10 space-y-3 mt-auto">
                  <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Editor Hint</h4>
                  <p className="text-[9px] text-sky-500/60 leading-relaxed italic font-medium">
                    "Tap anywhere on the preview to focus that spot instantly."
                  </p>
                  <button
                    type="button"
                    onClick={() => { 
                      const newPositions = [...imagePositions];
                      newPositions[activeImageIndex] = '50% 50%';
                      setImagePositions(newPositions);
                      const newZooms = [...imageZooms];
                      newZooms[activeImageIndex] = 100;
                      setImageZooms(newZooms);
                    }}
                    className="w-full py-2.5 bg-sky-500/10 text-sky-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-sky-500 hover:text-white transition-all border border-sky-500/20"
                  >
                    Reset Defaults
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* BIG SCREEN LIGHTBOX */}
      {isLightboxOpen && ((newProduct.images || [])[activeImageIndex] || imageFiles[activeImageIndex]) && (
        <div className="fixed inset-0 bg-gray-950 flex flex-col z-[300] animate-in fade-in duration-300">
          <div className="p-6 flex justify-between items-center border-b border-white/10 shrink-0">
            <h3 className="text-white text-xl font-black uppercase">Big Screen View</h3>
            <button onClick={() => setIsLightboxOpen(false)} className="text-white"><X size={24} /></button>
          </div>
          {/* Lightbox Main View */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-4">
            <div className="flex-1 w-full relative flex items-center justify-center">
              <button 
                onClick={() => setActiveImageIndex(prev => (prev > 0 ? prev - 1 : 2))}
                className="absolute left-4 z-50 p-4 bg-white/10 hover:bg-sky-500 rounded-full text-white backdrop-blur-xl transition-all"
              >
                <ChevronLeft size={32} />
              </button>

              <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
                <img
                  src={getImgSrc(activeImageIndex)}
                  className="max-w-[90vw] max-h-[70vh] object-contain transition-transform duration-300 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                  style={{ transform: `scale(${imageZooms[activeImageIndex] / 100})` }}
                />
              </div>

              <button 
                onClick={() => setActiveImageIndex(prev => (prev < 2 ? prev + 1 : 0))}
                className="absolute right-4 z-50 p-4 bg-white/10 hover:bg-sky-500 rounded-full text-white backdrop-blur-xl transition-all"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Lightbox Footer: Thumbnails & Zoom */}
            <div className="w-full max-w-4xl p-6 border-t border-white/10 flex flex-col items-center gap-6 bg-gray-950/50 backdrop-blur-xl rounded-t-[40px] mt-4">
              <div className="flex gap-4">
                {[0, 1, 2].map((idx) => {
                  const img = getImgSrc(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl border-2 transition-all overflow-hidden ${activeImageIndex === idx ? 'border-sky-500 scale-110 shadow-lg shadow-sky-500/20' : 'border-white/10 opacity-40 hover:opacity-100'}`}
                    >
                      {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center"><Plus size={16} className="text-white/20" /></div>}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-4 w-full max-w-md">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Precision Zoom</span>
                <input 
                  type="range" min="100" max="400" step="10"
                  className="flex-1 accent-sky-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  value={imageZooms[activeImageIndex]}
                  onChange={(e) => {
                    const newZooms = [...imageZooms];
                    newZooms[activeImageIndex] = parseInt(e.target.value);
                    setImageZooms(newZooms);
                  }}
                />
                <span className="text-white text-[10px] font-black w-10">{imageZooms[activeImageIndex]}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4 flex justify-between items-center border-b">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Promote Product</span>
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Add this product to an active offer banner
                </p>
              </div>
              <button
                onClick={() => setIsPromoteModalOpen(false)}
                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handlePromoteProductSubmit} className="p-8 space-y-6">
              {promotingProduct && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border">
                  {promotingProduct.image && (
                    <img src={promotingProduct.image} alt={promotingProduct.name} className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div>
                    <h4 className="text-sm font-black text-gray-900 line-clamp-1">{promotingProduct.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400">MRP: ₹{promotingProduct.mrp} | Selling Price: ₹{promotingProduct.price}</p>
                  </div>
                </div>
              )}

              {vendorBanners.length === 0 ? (
                <div className="p-5 bg-rose-50 rounded-3xl border border-rose-100 text-center space-y-2">
                  <AlertCircle size={24} className="text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-800">You don't have any active or unexpired offer banners.</p>
                  <a
                    href="/vendor/dashboard/banners"
                    className="text-xs font-black uppercase tracking-widest text-sky-600 hover:underline block"
                    onClick={() => setIsPromoteModalOpen(false)}
                  >
                    Create a Banner First →
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                      Select Offer Banner *
                    </label>
                    <select
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                      value={selectedBannerId}
                      onChange={(e) => setSelectedBannerId(e.target.value)}
                      required
                    >
                      {vendorBanners.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.title} ({b.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-amber-850 leading-relaxed">
                      If you want to offer a discount on this product for the banner, you can modify its selling price directly in the product edit details form at any time.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 border-t pt-6">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="flex-1 h-14 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPromoteSubmitting || vendorBanners.length === 0}
                  className="flex-[2] h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPromoteSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} strokeWidth={3} />
                  )}
                  <span>Promote Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto relative">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition-all z-10"
            >
              <X size={18} strokeWidth={3} />
            </button>
            <div className="p-8">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Upload className="text-sky-500" size={24} /> Bulk Import Products
                </h2>
                <button
                  onClick={() => setShowBulkInstructions(!showBulkInstructions)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                >
                  <AlertCircle size={14} /> {showBulkInstructions ? 'Hide Instructions' : 'View Instructions'}
                </button>
              </div>
              <p className="text-xs font-bold text-gray-500 mb-6">Upload your Excel or CSV file to add multiple products at once.</p>
              
              {showBulkInstructions && (
                <div className="mb-6 bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h3 className="text-sm font-black text-indigo-900 mb-3 uppercase tracking-widest">Excel Column Guide</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">Name</span> (Required) - Exact product name
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">Barcode</span> - Product barcode/UPC
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">MRP</span> (Required) - Maximum Retail Price (e.g. 50)
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">Selling Price</span> (Required) - Store price (e.g. 45)
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">B2B Wholesale Price</span> - Price for bulk buyers
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">B2B Business Price</span> - Price for verified businesses
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">Stock</span> - Current inventory count
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                      <span className="font-black text-gray-900">Category</span> - Product category (e.g. Snacks)
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-500 mt-4 font-bold">Note: Do not rename or remove the column headers from the template file.</p>
                </div>
              )}
              
              {/* Tutorial Section */}
              <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-gray-800">Watch Tutorial</h3>
                  <div className="flex gap-1">
                    {['english', 'hindi', 'kannada'].map(lang => (
                      <button 
                        key={lang}
                        onClick={() => setBulkLang(lang)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${bulkLang === lang ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner">
                  {/* Mock iframe for youtube */}
                  <div className="text-center text-white p-4">
                    <Zap size={32} className="mx-auto text-sky-400 mb-2 opacity-50" />
                    <p className="text-xs font-bold opacity-75">YouTube Tutorial ({bulkLang.toUpperCase()}) goes here</p>
                    <p className="text-[10px] opacity-50 mt-1">Embed link: https://youtube.com/embed/...</p>
                  </div>
                </div>
              </div>

              {/* Template Section */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Step 1: Get Template</h3>
                  <p className="text-[10px] font-bold text-amber-800 mb-3 leading-relaxed">
                    Download the template. Do not change the column headers. Fill in your product details.
                  </p>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 w-full"
                  >
                    <DownloadIcon size={14} /> Download .XLSX
                  </button>
                </div>
                <div className="flex-1 bg-sky-50 rounded-2xl p-4 border border-sky-100 flex flex-col">
                  <h3 className="text-xs font-black text-sky-900 uppercase tracking-widest mb-1">Step 2: Upload File</h3>
                  <p className="text-[10px] font-bold text-sky-800 mb-3 leading-relaxed">
                    Select your completed file.
                  </p>
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-sky-200 rounded-xl bg-white cursor-pointer hover:border-sky-400 transition-all min-h-[60px]">
                    <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1">
                      <Upload size={12} /> {bulkFile ? bulkFile.name : 'Select File'}
                    </span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                      onChange={e => setBulkFile(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleBulkImport(false)}
                  disabled={isBulkSubmitting}
                  className="p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition-all disabled:opacity-50 text-left group"
                >
                  <h4 className="text-sm font-black text-gray-800 mb-1 group-hover:text-gray-900">Basic Import (Free)</h4>
                  <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                    Imports products exactly as they are in the sheet. No images or auto-filled data.
                  </p>
                </button>
                
                <button
                  onClick={() => handleBulkImport(true)}
                  disabled={isBulkSubmitting}
                  className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 text-left relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 pointer-events-none" />
                  <h4 className="text-sm font-black mb-1 flex items-center gap-1">
                    <Sparkles size={14} /> Master Catalog Sync
                  </h4>
                  <p className="text-[10px] font-bold text-emerald-50 leading-relaxed">
                    Automatically fetches HD images, categories, and descriptions for all items! (Premium unlock)
                  </p>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes blink-orange-glow {
            0%, 100% { opacity: 1; box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
            50% { opacity: 0.8; box-shadow: 0 0 40px rgba(245, 158, 11, 0.6); }
          }
          @keyframes blink-red-orange {
            0%, 100% { background-color: #f59e0b; }
            50% { background-color: #ef4444; }
          }
          .animate-blink-orange {
            animation: blink-orange-glow 2s infinite ease-in-out;
          }
          .animate-blink-red-orange {
            animation: blink-red-orange 1.5s infinite ease-in-out;
          }
        `}
      </style>
    </div>
  );
};

export default Inventory;
