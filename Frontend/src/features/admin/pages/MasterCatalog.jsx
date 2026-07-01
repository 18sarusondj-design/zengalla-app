import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Trash2, Edit2, Upload, Loader2, X, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../../config/api.js';
import { toast } from 'sonner';

const MasterCatalog = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showMissingImages, setShowMissingImages] = useState(false);
  const limit = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', description: '', barcode: '', category: '', imageUrl: '', hsnCode: '', taxRate: 0, basePrice: 0, unit: 'pcs', sellingType: 'piece'
  });

  const [bulkData, setBulkData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, [page, showMissingImages]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (page === 1) fetchProducts();
      else setPage(1); // changing page will trigger fetch
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const missingParam = showMissingImages ? '&missingImage=true' : '';
      const { data } = await api.get(`/master-products?page=${page}&limit=${limit}&search=${searchTerm}${missingParam}`);
      if (data.success) {
        setProducts(data.products);
        setTotal(data.total);
      }
    } catch (err) {
      toast.error('Failed to load master catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (prod = null) => {
    if (prod) {
      setEditingId(prod._id);
      setFormData(prod);
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', barcode: '', category: '', imageUrl: '', hsnCode: '', taxRate: 0, basePrice: 0, unit: 'pcs', sellingType: 'piece' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/master-products/${editingId}`, formData);
        toast.success('Product updated');
      } else {
        await api.post('/master-products', formData);
        toast.success('Product added');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product from master catalog?')) return;
    try {
      await api.delete(`/master-products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData) return toast.error('Paste JSON data first');
    setIsImporting(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(bulkData);
      } catch(e) {
        throw new Error('Invalid JSON format');
      }
      const { data } = await api.post('/master-products/bulk-import', { products: parsed });
      toast.success(`Imported: ${data.added}, Skipped: ${data.skipped}`);
      setIsBulkOpen(false);
      setBulkData('');
      fetchProducts();
    } catch (err) {
      toast.error(err.message || err.response?.data?.error || 'Bulk import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false }); // raw false treats everything as string where needed

        // Transform if necessary to match DB keys
        const formattedData = data.map(item => ({
          barcode: String(item.Barcode || item.barcode || ''),
          name: item.Name || item.name || '',
          category: item.Category || item.category || 'General',
          brand: item.Brand || item.brand || '',
          mrp: parseFloat(item.MRP || item.mrp || 0),
          unit: item.Unit || item.unit || 'pcs',
          taxRate: parseFloat(item.GST || item['GST %'] || item.taxRate || 0)
        })).filter(item => item.barcode && item.name); // only keep valid rows

        if (formattedData.length === 0) {
          throw new Error('No valid products found in file. Ensure columns like Barcode, Name exist.');
        }

        const res = await api.post('/master-products/bulk-import', { products: formattedData });
        toast.success(`Imported: ${res.data.added}, Skipped: ${res.data.skipped}`);
        fetchProducts();
      } catch (err) {
        toast.error(err.message || 'Excel import failed');
      } finally {
        setIsImporting(false);
        e.target.value = ''; // reset file input
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);

    setIsUploading(true);
    const toastId = toast.loading('Uploading image...');
    try {
      const { data } = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        toast.success('Image uploaded successfully', { id: toastId });
      }
    } catch (err) {
      toast.error('Failed to upload image', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAutoFetch = async () => {
    if (!formData.barcode) return toast.error('Enter a barcode first');
    const toastId = toast.loading('Searching global database...');
    try {
      const { data } = await api.get(`/master-products/search?barcode=${formData.barcode}`);
      if (data.success && data.data) {
        toast.success('Found product details!', { id: toastId });
        setFormData(prev => ({
          ...prev,
          name: data.data.name || prev.name,
          category: data.data.category || prev.category,
          imageUrl: data.data.imageUrl || prev.imageUrl,
          description: data.data.description || prev.description
        }));
      }
    } catch (err) {
      toast.error('Product not found in global database', { id: toastId });
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Master <span className="text-emerald-500">Catalog</span>
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Manage global product database</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleExcelImport} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 bg-white border-2 border-blue-100 text-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
          >
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} 
            Bulk Excel Import
          </button>
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 bg-white border-2 border-emerald-100 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
          >
            <Upload size={14} /> Bulk JSON Import
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-gray-50 p-2 rounded-2xl border border-gray-100">
          <div className="flex-1 flex items-center gap-2 w-full">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search by name or barcode..." 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 placeholder-gray-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowMissingImages(!showMissingImages)}
            className={`px-4 py-2 w-full sm:w-auto rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${showMissingImages ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-100'}`}
          >
            {showMissingImages ? 'Viewing: No Image Only' : 'Filter: Missing Images'}
          </button>
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Barcode</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">GST %</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-emerald-500" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-xs font-bold text-gray-400 uppercase">No products found in master catalog.</td>
                </tr>
              ) : products.map(p => (
                <tr key={p._id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                          <Package size={16} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{p.name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.unit} - {p.sellingType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-bold text-gray-600">{p.barcode}</td>
                  <td className="p-4 text-[10px] font-black text-emerald-600 bg-emerald-50 rounded-full px-3 py-1 w-fit mt-3 inline-block uppercase tracking-widest">{p.category}</td>
                  <td className="p-4 text-xs font-bold text-gray-600">{p.taxRate}%</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenModal(p)} className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
          <p>Showing {products.length} of {total} products</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">Prev</button>
            <button disabled={products.length < limit} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 rounded-xl hover:bg-rose-50 hover:text-rose-500"><X size={16}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Barcode *</label>
                  <div className="flex gap-2">
                    <input required type="text" value={formData.barcode} onChange={e=>setFormData({...formData, barcode: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:border-emerald-500 text-xs font-bold transition-colors" />
                    <button 
                      type="button" 
                      onClick={handleAutoFetch}
                      className="whitespace-nowrap px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      <Search size={14} /> Auto Fetch
                    </button>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Name *</label>
                  <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:border-emerald-500 text-xs font-bold transition-colors" />
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Category</label>
                  <input type="text" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:border-emerald-500 text-xs font-bold transition-colors" />
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2">GST %</label>
                  <input type="number" min="0" value={formData.taxRate} onChange={e=>setFormData({...formData, taxRate: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:border-emerald-500 text-xs font-bold transition-colors" />
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2">HSN Code</label>
                  <input type="text" value={formData.hsnCode} onChange={e=>setFormData({...formData, hsnCode: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:border-emerald-500 text-xs font-bold transition-colors" />
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Product Image</label>
                  <div className="flex items-center gap-3">
                    {formData.imageUrl ? (
                      <div className="relative group w-12 h-12 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
                        <img src={formData.imageUrl} alt="Product" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, imageUrl: ''})} 
                          className="absolute inset-0 bg-black/50 items-center justify-center text-white hidden group-hover:flex"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <Package size={16} />
                      </div>
                    )}
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-300 focus-within:border-emerald-500 text-xs font-bold transition-colors cursor-pointer hover:bg-emerald-50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {isUploading ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <Upload size={16} className="text-gray-400" />}
                      <span className="text-gray-600">{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest mt-4 hover:bg-emerald-600 transition-colors">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Bulk Import JSON</h2>
              <button onClick={() => setIsBulkOpen(false)} className="p-2 bg-gray-50 rounded-xl hover:bg-rose-50 hover:text-rose-500"><X size={16}/></button>
            </div>
            <p className="text-xs font-bold text-gray-500 mb-4">Paste an array of product objects. E.g. <code className="bg-gray-100 px-1 py-0.5 rounded text-sky-500">[{"{ barcode: '123', name: 'Item', category: 'General' }"}]</code></p>
            <textarea 
              rows="10" 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-mono mb-4 focus:bg-white"
              value={bulkData}
              onChange={e => setBulkData(e.target.value)}
              placeholder="Paste JSON here..."
            ></textarea>
            <button onClick={handleBulkImport} disabled={isImporting} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-600 transition-colors">
              {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Import Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterCatalog;
