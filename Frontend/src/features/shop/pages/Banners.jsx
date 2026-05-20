import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Eye, Trash2, HelpCircle, Play, ExternalLink, Calendar, Sparkles, Clock, X, Check, AlertCircle, Loader2, Image as ImageIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import { useStore } from '../context/StoreContext';

const Banners = () => {
  const { vendorShop } = useStore();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [type, setType] = useState('Today\'s Best Deals');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const bannerTypes = [
    "Today's Best Deals",
    "End Month Savings",
    "Fresh Savings",
    "Festival Specials",
    "BOGO Offers",
    "General Deals"
  ];

  // Fetch all vendor banners
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/banners/my');
      if (data?.success) {
        setBanners(data.banners || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Image Upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploadLoading(true);
    try {
      const { data } = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.url) {
        setImage(data.url);
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error('Image URL not returned');
      }
    } catch (err) {
      toast.error('Failed to upload image. Please try entering a direct URL.');
    } finally {
      setIsUploadLoading(false);
    }
  };

  // Open Form modal for creation or edit
  const openFormModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setTitle(banner.title);
      setSubtitle(banner.subtitle || '');
      setImage(banner.image || '');
      setType(banner.type || 'Today\'s Best Deals');
      setStartDate(banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '');
      setEndDate(banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '');
      setIsActive(banner.isActive);
    } else {
      setEditingBanner(null);
      setTitle('');
      setSubtitle('');
      setImage('');
      setType('Today\'s Best Deals');
      // Default to today and next week
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(nextWeek);
      setIsActive(true);
    }
    setIsFormOpen(true);
  };

  // Submit banner form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Banner Title is required');
    if (!startDate) return toast.error('Start Date is required');
    if (!endDate) return toast.error('End Date is required');
    if (new Date(startDate) > new Date(endDate)) {
      return toast.error('Start Date must be before or equal to End Date');
    }

    const payload = {
      title,
      subtitle,
      image,
      type,
      startDate,
      endDate,
      isActive
    };

    setIsSubmitLoading(true);
    try {
      let response;
      if (editingBanner) {
        response = await api.put(`/banners/${editingBanner._id}`, payload);
        if (response.data?.success) {
          toast.success('Banner updated successfully!');
        }
      } else {
        response = await api.post('/banners', payload);
        if (response.data?.success) {
          toast.success('Banner created successfully!');
        }
      }
      setIsFormOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save banner');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Delete banner
  const handleDelete = (bannerId) => {
    toast('Delete this promotional banner?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          setIsDeleting(bannerId);
          try {
            const { data } = await api.delete(`/banners/${bannerId}`);
            if (data?.success) {
              toast.success('Banner deleted');
              fetchBanners();
            }
          } catch (err) {
            toast.error('Failed to delete banner');
          } finally {
            setIsDeleting(null);
          }
        }
      },
      cancel: {
        label: 'Cancel',
      },
    });
  };

  // Quick toggle active status
  const handleToggleActive = async (banner) => {
    try {
      const { data } = await api.put(`/banners/${banner._id}`, {
        isActive: !banner.isActive
      });
      if (data?.success) {
        toast.success(`Banner is now ${data.banner.isActive ? 'Active' : 'Inactive'}`);
        // update local list
        setBanners(prev => prev.map(b => b._id === banner._id ? { ...b, isActive: data.banner.isActive } : b));
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const isExpired = (banner) => {
    const now = new Date();
    return new Date(banner.endDate) < now;
  };

  const isNotStarted = (banner) => {
    const now = new Date();
    return new Date(banner.startDate) > now;
  };

  if (vendorShop && !vendorShop.bannersEnabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[500px]">
        <div className="max-w-md w-full bg-white rounded-[32px] p-10 border border-slate-100 shadow-xl text-center space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-lg shadow-rose-50 animate-bounce">
            <AlertCircle size={40} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Offer Banners Gated</h2>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Super Admin Authorization Required</p>
          </div>
          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            The Promotional Offer Banners feature is currently locked for your storefront. Please contact the platform Super Admin (<strong>sarusondj@gmail.com</strong>) to grant access to your store.
          </p>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <a 
              href="mailto:sarusondj@gmail.com?subject=Enable Offer Banners for my Shop" 
              className="flex items-center justify-center gap-2 w-full h-12 bg-sky-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-sky-100"
            >
              Contact Administrator
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black tracking-[0.2em] text-sky-500 uppercase leading-none">
              Marketing Suite
            </span>
            <Sparkles size={12} className="text-sky-500" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Offer Banners
          </h1>
          <p className="text-xs font-bold text-gray-400 mt-1">
            Create beautiful sliding promotional banners to highlight your store deals and linked products.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex-1 md:flex-initial h-11 sm:h-12 px-3 sm:px-5 flex items-center justify-center gap-1.5 bg-sky-50 hover:bg-sky-100/80 text-sky-600 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest border border-sky-100 transition-all active:scale-95 shrink-0"
          >
            <HelpCircle size={14} strokeWidth={2.5} />
            <span>How to Create?</span>
          </button>

          {/* Create Button */}
          <button
            onClick={() => openFormModal()}
            className="flex-1 md:flex-initial h-11 sm:h-12 px-4 sm:px-6 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest shadow-lg shadow-gray-200 transition-all active:scale-95 shrink-0"
          >
            <Plus size={14} strokeWidth={3} />
            <span>New Banner</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-[32px] p-16 text-center space-y-4 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 mx-auto">
              <Sparkles size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">No Banners Found</h3>
              <p className="text-xs font-bold text-gray-400">
                You haven't created any promotional banners yet. Banners help increase customer sales!
              </p>
            </div>
            <button
              onClick={() => openFormModal()}
              className="h-12 px-6 inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-sky-100 transition-all active:scale-95"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Create Your First Banner</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {banners.map((banner) => {
              const expired = isExpired(banner);
              const notStarted = isNotStarted(banner);
              
              return (
                <div
                  key={banner._id}
                  className={`bg-white border rounded-[32px] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md hover:border-gray-200 group relative ${!banner.isActive ? 'opacity-85' : ''}`}
                >
                  {/* Banner Header Image */}
                  <div className="h-44 bg-gray-50 relative overflow-hidden flex items-center justify-center border-b">
                    {banner.image ? (
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <ImageIcon size={40} strokeWidth={1} />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Custom Image</span>
                      </div>
                    )}

                    {/* Banner Category Badge */}
                    <span className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-sm">
                      {banner.type}
                    </span>

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      {expired ? (
                        <span className="px-3 py-1.5 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1">
                          <Clock size={10} /> Expired
                        </span>
                      ) : notStarted ? (
                        <span className="px-3 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1">
                          <Clock size={10} /> Upcoming
                        </span>
                      ) : banner.isActive ? (
                        <span className="px-3 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1 animate-pulse">
                          <Check size={10} strokeWidth={3} /> Live
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-400 text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1">
                          <X size={10} strokeWidth={3} /> Paused
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Banner Information */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight uppercase line-clamp-1">
                        {banner.title}
                      </h3>
                      {banner.subtitle && (
                        <p className="text-xs font-bold text-gray-400 line-clamp-1">{banner.subtitle}</p>
                      )}
                    </div>

                    {/* Date Details */}
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" />
                        <span>{new Date(banner.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <span className="text-gray-300">→</span>
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" />
                        <span>{new Date(banner.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Product count and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                          {banner.products?.length || 0} Products
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick Active Toggle */}
                        <button
                          onClick={() => handleToggleActive(banner)}
                          title={banner.isActive ? "Pause Banner" : "Resume Banner"}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${banner.isActive ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                        >
                          {banner.isActive ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openFormModal(banner)}
                          className="w-8 h-8 rounded-xl text-sky-600 bg-sky-50 hover:bg-sky-100 transition-all flex items-center justify-center"
                          title="Edit"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(banner._id)}
                          disabled={isDeleting === banner._id}
                          className="w-8 h-8 rounded-xl text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all flex items-center justify-center disabled:opacity-50"
                          title="Delete"
                        >
                          {isDeleting === banner._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tutorial Video Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4 flex justify-between items-center border-b">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2">
                  <Play size={18} fill="currentColor" className="text-sky-500" />
                  <span>How to Create Offers & Banners?</span>
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Learn to configure marketing banners for maximum customer engagement
                </p>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Video Embed Frame */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-150 relative shadow-inner border">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Banner Configuration Tutorial"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Helpful instructions list */}
              <div className="p-5 bg-sky-50 rounded-3xl border border-sky-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-100">
                  <Sparkles size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-sky-900 uppercase tracking-widest">Promotion Tips</h4>
                  <p className="text-xs font-bold text-sky-800/80 leading-relaxed">
                    Choose catchy titles, upload vibrant landscape banners (recommended ratio 3:1), and assign popular discounted items from your inventory directly using the "Promote Product" button.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <a
                  href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-14 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-gray-250"
                >
                  <ExternalLink size={14} />
                  <span>Open in YouTube</span>
                </a>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="flex-[2] h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 transition-all flex items-center justify-center"
                >
                  Got It, Thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 my-8" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4 flex justify-between items-center border-b">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2">
                  <Sparkles size={18} className="text-sky-500" />
                  <span>{editingBanner ? 'Edit Banner' : 'Create Offer Banner'}</span>
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Configure titles, display images, and duration dates
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Banner Message / Title */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                    Banner Title / Message *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. End Month Savings! Flat 20% Off"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                    Subtitle / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stock up on fresh vegetables and monthly groceries"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>

                {/* Banner Type / Category */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                    Banner Category / Position Type *
                  </label>
                  <select
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {bannerTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Banner Image Uploader & URL */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                    Banner Display Image (Optional)
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      {/* Image Input field */}
                      <input
                        type="url"
                        placeholder="Paste image URL here..."
                        className="flex-1 bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                      />
                      
                      {/* File Uploader button */}
                      <label className="h-14 px-5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-sky-100 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                        {isUploadLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ImageIcon size={16} />
                        )}
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={isUploadLoading}
                        />
                      </label>
                    </div>

                    {image && (
                      <div className="h-28 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden relative flex items-center justify-center">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-rose-600 transition-all"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Start Date & End Date Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl h-14 px-5 text-sm font-bold text-gray-800 focus:outline-none transition-all"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Active Toggle Switch */}
                <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-900">Active Status</span>
                    <p className="text-[10px] font-bold text-gray-400">If checked, this banner will appear active during scheduled dates.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="text-sky-500 hover:text-sky-600 transition-all shrink-0"
                  >
                    {isActive ? (
                      <ToggleRight size={44} strokeWidth={1.5} />
                    ) : (
                      <ToggleLeft size={44} strokeWidth={1.5} className="text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-4 border-t pt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 h-14 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex-[2] h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-250 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} strokeWidth={3} />
                  )}
                  <span>{editingBanner ? 'Save Changes' : 'Create Banner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;
