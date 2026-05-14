import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { 
  UserPlus, Search, Edit3, Trash2, Phone, Mail, MapPin, 
  ChevronRight, Building2, CreditCard, Clock, Info, 
  CheckCircle2, XCircle, Filter, Plus, ArrowLeft,
  X, Save, Loader2, MoreVertical, Download,
  ExternalLink, IndianRupee, Briefcase, User, History as HistoryIcon, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../../config/api';

const B2BPartners = () => {
  const navigate = useNavigate();
  const { vendorShop, fetchVendorShop } = useStore();
  const [partners, setPartners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    gstin: '',
    phone: '',
    altPhone: '',
    email: '',
    billingAddress: '',
    shippingAddress: '',
    state: '',
    stateCode: '',
    pincode: '',
    city: '',
    landmark: '',
    buyerType: 'Retailer',
    creditLimit: 0,
    paymentTerms: 'Instant',
    notes: '',
    isActive: true
  });

  useEffect(() => {
    if (vendorShop?.b2bPartners) {
      setPartners(vendorShop.b2bPartners);
    }
  }, [vendorShop]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openAddModal = () => {
    setEditingPartner(null);
    setFormData({
      businessName: '', ownerName: '', gstin: '', phone: '', altPhone: '',
      email: '', billingAddress: '', shippingAddress: '', state: '',
      stateCode: '', pincode: '', city: '', landmark: '',
      buyerType: 'Retailer', creditLimit: 0, paymentTerms: 'Instant',
      notes: '', isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (partner) => {
    setEditingPartner(partner);
    setFormData({ ...partner });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (editingPartner) {
        const res = await api.put(`/shops/my/b2b-partners/${editingPartner.phone}`, formData);
        if (res.data.success) {
          toast.success("Partner updated successfully");
          fetchVendorShop();
          setIsModalOpen(false);
        }
      } else {
        const res = await api.post('/shops/my/b2b-partners', formData);
        if (res.data.success) {
          toast.success("New partner added successfully");
          fetchVendorShop();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save partner");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLookupShop = async () => {
    if (!formData.phone || formData.phone.length < 10) {
      return toast.error("Enter a valid 10-digit phone number to lookup");
    }
    setIsProcessing(true);
    try {
      const res = await api.get(`/shops/lookup/b2b?phone=${formData.phone}`);
      if (res.data.success) {
        const { shop } = res.data;
        setFormData(prev => ({
          ...prev,
          businessName: shop.businessName || prev.businessName,
          ownerName: shop.ownerName || prev.ownerName,
          gstin: shop.gstin || prev.gstin,
          email: shop.email || prev.email,
          billingAddress: shop.billingAddress || prev.billingAddress,
          city: shop.city || prev.city,
          pincode: shop.pincode || prev.pincode
        }));
        toast.success("Shop details found and populated!");
      }
    } catch (err) {
      toast.error("No registered shop found with this phone number. Please enter details manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (phone) => {
    if (!window.confirm("Are you sure you want to delete this partner?")) return;
    try {
      const res = await api.delete(`/shops/my/b2b-partners/${phone}`);
      if (res.data.success) {
        toast.success("Partner deleted");
        fetchVendorShop();
      }
    } catch (err) {
      toast.error("Failed to delete partner");
    }
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = 
      p.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.phone?.includes(searchQuery) ||
      p.gstin?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'All' || p.buyerType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col md:h-screen md:overflow-hidden min-h-screen bg-slate-50/50 md:p-10 p-2 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 md:mb-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/vendor/dashboard')} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-sky-600 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">B2B Partners</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Enterprise Relationship Management</p>
            </div>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-sky-600 text-white px-8 py-4 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-sky-100 hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} strokeWidth={3} /> Add New Partner
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 md:overflow-hidden">
          {/* Left Side: Stats Column */}
          <div className="w-full lg:w-80 flex flex-col gap-4 md:overflow-y-auto custom-scrollbar pb-4 lg:pb-0">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-sky-500 transition-all">
              <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                <Briefcase size={28} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Partners</p>
                 <p className="text-2xl font-black text-slate-900 leading-none">{partners.length}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-500 transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <CheckCircle2 size={28} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Accounts</p>
                 <p className="text-2xl font-black text-slate-900 leading-none">{partners.filter(p => p.isActive).length}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-rose-500 transition-all">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                <IndianRupee size={28} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Exposure</p>
                 <p className="text-2xl font-black text-slate-900 leading-none">₹{partners.reduce((acc, p) => acc + (p.creditLimit || 0), 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-500 transition-all">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Clock size={28} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Users</p>
                 <p className="text-2xl font-black text-slate-900 leading-none">{partners.filter(p => p.paymentTerms !== 'Instant').length}</p>
              </div>
            </div>
          </div>

          {/* Right Side: Partners List */}
          <div className="flex-1 flex flex-col gap-6 min-h-0 md:overflow-hidden">
                {/* Filters */}
            <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by Business Name, GSTIN or Phone..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-bold text-sm outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {['All', 'Retailer', 'Wholesaler', 'Restaurant'].map((type) => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${filterType === type ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
               <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                           <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Partner Detail</th>
                           <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identification</th>
                           <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Commercials</th>
                           <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredPartners.map((partner, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/30 transition-all group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-black text-lg">
                                       {partner.businessName?.[0] || 'B'}
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2 mb-1">
                                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{partner.businessName}</h4>
                                          <span className={`px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase tracking-widest ${partner.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                             {partner.isActive ? 'Active' : 'Inactive'}
                                          </span>
                                       </div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><User size={10} /> {partner.ownerName}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-widest">
                                       <Phone size={12} className="text-sky-500" /> {partner.phone}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">GST: <span className="text-slate-500">{partner.gstin || 'N/A'}</span></div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-900 font-bold text-[11px] uppercase tracking-widest">
                                       <IndianRupee size={12} className="text-rose-500" /> ₹{partner.creditLimit?.toLocaleString()} Limit
                                    </div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{partner.buyerType} • {partner.paymentTerms}</div>
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => openEditModal(partner)} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm">
                                       <Eye size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(partner.phone)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FORM: Register / Edit Partner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{editingPartner ? 'Edit Partner Details' : 'Register New Partner'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Review and update business intelligence</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-visible">
                  <form onSubmit={handleSubmit} className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info Section */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Building2 size={14} /> Business Identity
                      </h3>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Business Name</label>
                          <input 
                            type="text" required name="businessName"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                            value={formData.businessName} onChange={handleInputChange}
                          />
                        </div>
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Owner Name</label>
                          <input 
                            type="text" required name="ownerName"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                            value={formData.ownerName} onChange={handleInputChange}
                          />
                        </div>
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">GSTIN Number</label>
                          <input 
                            type="text" name="gstin"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                            value={formData.gstin} onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <h3 className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] flex items-center gap-2 pt-4">
                        <Phone size={14} /> Contact Channels
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Phone</label>
                          <div className="relative">
                            <input 
                              type="text" required name="phone"
                              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-6 pr-12 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                              value={formData.phone} onChange={handleInputChange}
                              placeholder="Lookup by phone..."
                            />
                            <button 
                              type="button"
                              onClick={handleLookupShop}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                              title="Lookup shop on Zengalla"
                            >
                              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} strokeWidth={3} />}
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Email</label>
                          <input 
                            type="email" name="email"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                            value={formData.email} onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logistics Section */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <MapPin size={14} /> Logistics & Address
                      </h3>
                      <div className="space-y-6">
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Billing Address</label>
                          <textarea 
                            name="billingAddress"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all resize-none h-24"
                            value={formData.billingAddress} onChange={handleInputChange}
                          ></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative">
                            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">City</label>
                            <input 
                              type="text" name="city"
                              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                              value={formData.city} onChange={handleInputChange}
                            />
                          </div>
                          <div className="relative">
                            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Pincode</label>
                            <input 
                              type="text" name="pincode"
                              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all"
                              value={formData.pincode} onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>

                      <h3 className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] flex items-center gap-2 pt-4">
                        <CreditCard size={14} /> Commercial Terms
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Buyer Type</label>
                          <select 
                            name="buyerType"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all appearance-none"
                            value={formData.buyerType} onChange={handleInputChange}
                          >
                            <option value="Retailer">Retailer</option>
                            <option value="Wholesaler">Wholesaler</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Restaurant">Restaurant</option>
                          </select>
                        </div>
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">Payment Terms</label>
                          <select 
                            name="paymentTerms"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all appearance-none"
                            value={formData.paymentTerms} onChange={handleInputChange}
                          >
                            <option value="Instant">Instant</option>
                            <option value="7 Days">7 Days</option>
                            <option value="15 Days">15 Days</option>
                            <option value="30 Days">30 Days</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" name="isActive" id="isActive"
                          className="w-6 h-6 rounded-lg text-sky-600 focus:ring-sky-500 border-slate-200 transition-all cursor-pointer"
                          checked={formData.isActive} onChange={handleInputChange}
                        />
                        <label htmlFor="isActive" className="text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer">Active Partner</label>
                    </div>
                    <div className="flex gap-4">
                        {editingPartner && (
                          <button 
                            type="button" 
                            onClick={() => { handleDelete(editingPartner.phone); setIsModalOpen(false); }}
                            className="px-8 py-4 bg-rose-50 text-rose-600 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete Partner
                          </button>
                        )}
                        <button 
                          type="button" onClick={() => setIsModalOpen(false)}
                          className="px-8 py-4 bg-slate-50 text-slate-400 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                        >
                          Back to List
                        </button>
                        <button 
                          type="submit" disabled={isProcessing}
                          className="px-10 py-4 bg-sky-600 text-white rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-700 transition-all flex items-center gap-2"
                        >
                          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          {editingPartner ? 'Save Changes' : 'Register Partner'}
                        </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default B2BPartners;
