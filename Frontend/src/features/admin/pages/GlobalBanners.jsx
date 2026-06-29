import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Link as LinkIcon, Image as ImageIcon, Sparkles } from 'lucide-react';
import api from '../../../config/api.js';
import { toast } from 'sonner';
import ImageCropper from '../../../common/components/ImageCropper';

export default function GlobalBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    subtitle: '',
    linkUrl: '',
    isActive: true,
    priority: 0
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/global-banners/admin');
      if (data.success) {
        setBanners(data.banners);
      }
    } catch (error) {
      toast.error('Failed to fetch global banners');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        imageUrl: banner.imageUrl || '',
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        linkUrl: banner.linkUrl || '',
        isActive: banner.isActive ?? true,
        priority: banner.priority || 0
      });
    } else {
      setEditingBanner(null);
      setFormData({
        imageUrl: '',
        title: '',
        subtitle: '',
        linkUrl: '',
        isActive: true,
        priority: 0
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Photo is too large! Please use an image smaller than 5MB.');
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => setCropImageSrc(reader.result));
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  const handleCropSave = async (file) => {
    setCropImageSrc(null);
    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading cropped banner image...');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const { data: uploadData } = await api.post('/upload/image', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      if (!uploadData.url) throw new Error('Server did not return an image URL');

      setFormData({ ...formData, imageUrl: uploadData.url });
      toast.success('Image uploaded successfully!', { id: toastId });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Unknown upload error';
      toast.error(`Upload failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCropCancel = () => {
    setCropImageSrc(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      return toast.error('Image URL is required');
    }

    try {
      if (editingBanner) {
        await api.put(`/global-banners/admin/${editingBanner._id}`, formData);
        toast.success('Banner updated successfully');
      } else {
        await api.post('/global-banners/admin', formData);
        toast.success('Banner created successfully');
      }
      fetchBanners();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save banner');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await api.delete(`/global-banners/admin/${id}`);
        toast.success('Banner deleted');
        fetchBanners();
      } catch (error) {
        toast.error('Failed to delete banner');
      }
    }
  };

  const toggleStatus = async (banner) => {
    try {
      await api.put(`/global-banners/admin/${banner._id}`, { isActive: !banner.isActive });
      fetchBanners();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
            <Sparkles className="text-sky-500" />
            Global Banners
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage home page carousel</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2"
        >
          <Plus size={16} /> Add Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner._id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col group relative">
            <div className="aspect-[21/9] w-full relative bg-gray-100 overflow-hidden">
              <img 
                src={banner.imageUrl} 
                alt="Banner" 
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${!banner.isActive ? 'grayscale opacity-70' : ''}`}
                onError={(e) => { e.target.src = 'https://placehold.co/1200x400/1e293b/ffffff?text=Image+Error'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                {banner.title && <h3 className="text-white font-bold text-sm line-clamp-1">{banner.title}</h3>}
                {banner.subtitle && <p className="text-white/70 text-xs line-clamp-1">{banner.subtitle}</p>}
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => toggleStatus(banner)}
                  className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${banner.isActive ? 'bg-emerald-500/80 text-white hover:bg-emerald-600' : 'bg-gray-500/80 text-white hover:bg-gray-600'}`}
                  title="Toggle Status"
                >
                  {banner.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                </button>
              </div>
            </div>
            
            <div className="p-4 flex flex-col gap-3 flex-1 bg-white">
              <div className="flex items-start gap-2">
                <LinkIcon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <a href={banner.linkUrl || '#'} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline break-all line-clamp-2">
                  {banner.linkUrl || 'No External Link'}
                </a>
              </div>
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-50">
                <div></div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(banner)} className="p-1.5 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(banner._id)} className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-[24px]">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-widest">No Banners Found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">{editingBanner ? 'Edit Banner' : 'New Banner'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Banner Image *</label>
                
                {formData.imageUrl ? (
                  <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-gray-200 group bg-gray-100">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={14} />
                        {isUploadingImage ? 'Uploading...' : 'Change Image'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className={`w-full aspect-[21/9] cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2 hover:bg-sky-50 hover:border-sky-300 transition-colors ${isUploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                    <ImageIcon size={32} className="text-gray-400" />
                    <span className="text-sky-600 font-black text-[10px] uppercase tracking-widest">
                      {isUploadingImage ? 'Uploading...' : 'Click to Upload Image'}
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">External Link URL</label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://sponsor-website.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <p className="text-[9px] text-gray-400 mt-1">Users will be redirected here when they click the banner.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <label htmlFor="isActive" className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Active Status</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50 mt-4">
                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-sky-200">
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropImageSrc && (
        <ImageCropper 
          imageSrc={cropImageSrc}
          aspect={21 / 9}
          onCropDone={handleCropSave}
          onCropCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
