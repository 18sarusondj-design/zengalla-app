import React, { useState, useEffect } from 'react';
import { useStore } from '../../shop/context/StoreContext';
import { UserPlus, Shield, Smartphone, Key, Trash2, CheckCircle2, XCircle, Loader2, User, UserCheck, Users, Lock, ChevronRight, Check, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getPasswordStrength } from '../../../utils/passwordStrength';
import { Mail } from 'lucide-react';


const StaffManagement = () => {
  const { getStaff, createStaff, updateStaff, deleteStaff, vendorShop, updateShop } = useStore();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // Staff object when in edit mode
  const [showPassword, setShowPassword] = useState(false);
  
  // Local state for global permissions
  const [shopPermissions, setShopPermissions] = useState({
    canManageInventory: true,
    canViewCustomers: true,
    staffAccessCode: '',
    storeCode: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    phone: ''
  });

  const passStrength = getPasswordStrength(formData.password);
  const isPassValid = editingStaff 
    ? (!formData.password || passStrength.isValid)
    : passStrength.isValid;

  useEffect(() => {
    if (vendorShop) {
      setShopPermissions({
        canManageInventory: vendorShop.staffPermissions?.canManageInventory ?? true,
        canViewCustomers: vendorShop.staffPermissions?.canViewCustomers ?? true,
        staffAccessCode: vendorShop.staffAccessCode || '',
        storeCode: vendorShop.storeCode || ''
      });
    }
  }, [vendorShop]);
  

  useEffect(() => {
    if (vendorShop?._id) {
      fetchStaff();
    }
  }, [vendorShop?._id]);

  const fetchStaff = async () => {
    setLoading(true);
    const data = await getStaff();
    setStaffList(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 0. Specific Validation
    if (!formData.name.trim()) return toast.error('Personnel name is required');
    if (!formData.phone || formData.phone.length !== 10) return toast.error('Mobile Identity must be exactly 10 digits');
    if (!editingStaff && !isPassValid) return toast.error('Security password must be at least 7 characters and include at least one number');

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        // Update Mode
        const res = await updateStaff(editingStaff.id, {
          name: formData.name,
          phone: formData.phone,
          password: formData.password || undefined // Only update password if provided
        });
        if (res.success) {
          setStaffList(prev => prev.map(s => s.id === editingStaff.id ? res.staff : s));
          setIsModalOpen(false);
          setEditingStaff(null);
          setFormData({ name: '', password: '', phone: '' });
          toast.success('Staff credentials updated');
        } else {
          throw new Error(res.error || 'Update failed');
        }
      } else {
        // Create Mode
        const res = await createStaff(formData);
        if (res.success) {
          setStaffList(prev => [...prev, res.staff]);
          setIsModalOpen(false);
          setFormData({ name: '', password: '', phone: '' });
          toast.success('New assistant granted access');
        } else {
          throw new Error(res.error || 'Registration failed');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Verification Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (staff) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active';
    const res = await updateStaff(staff._id, { status: newStatus });
    if (res.success) {
      setStaffList(prev => prev.map(s => s._id === staff._id ? { ...s, status: newStatus } : s));
    }
  };

  const handleDeleteStaff = (staffId) => {
    toast.error(`Remove assistant?`, {
      action: {
        label: "Delete",
        onClick: async () => {
           const res = await deleteStaff(staffId);
           if (res.success) setStaffList(prev => prev.filter(s => s._id !== staffId));
        }
      }
    });
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      phone: staff.phone,
      password: '' // Keep empty for security
    });
    setIsModalOpen(true);
  };

  const handleGlobalConfigSave = async () => {
    setIsUpdatingShop(true);
    const res = await updateShop({
      storeCode: shopPermissions.storeCode,
      staffPermissions: {
        canManageInventory: shopPermissions.canManageInventory,
        canViewCustomers: shopPermissions.canViewCustomers
      }
    });
    if (res.success) {
      toast.success('Global permissions synchronized');
    }
    setIsUpdatingShop(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  return (
    <div className="flex flex-col md:h-screen md:overflow-hidden min-h-screen bg-white p-2 md:p-8 md:rounded-[48px] border border-gray-100 shadow-sm relative overflow-hidden font-sans">
      {/* Premium Header */}
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 md:pb-10 border-b border-gray-100/50 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight uppercase leading-none">Store Personnel</h1>
            <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{staffList.length} Total</span>
            </div>
          </div>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">Advanced Authority & Access Control</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingStaff(null);
            setFormData({ name: '', phone: '', password: '' });
            setIsModalOpen(true);
          }}
          className="h-12 md:h-14 px-8 bg-sky-600 text-white rounded-[22px] font-black uppercase text-[10px] tracking-[0.15em] flex items-center gap-4 hover:bg-sky-700 hover:shadow-2xl hover:shadow-sky-200 transition-all active:scale-95 group shadow-xl shadow-sky-100"
        >
          <UserPlus size={16} className="group-hover:rotate-12 transition-transform" /> Add New Assistant
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 md:overflow-hidden">
        {/* Info Column - Enhanced Global Authority Control */}
        <div className="w-full lg:w-80 space-y-6 md:overflow-y-auto custom-scrollbar pb-4 lg:pb-0">
           <div className="bg-gradient-to-br from-indigo-50/80 to-white rounded-[32px] p-6 md:p-8 border border-indigo-100/50 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/20 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
              
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 mb-6 shadow-md border border-indigo-50 relative z-10">
                 <Shield size={28} strokeWidth={2.5} />
              </div>
              
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg mb-4 relative z-10">Global Authority</h3>
              
              <div className="space-y-4 relative z-10">
                 <div className="space-y-1.5 mb-2">
                    <label className="text-[9px] font-black text-sky-600 uppercase tracking-widest ml-2">Public Store Code (For Login)</label>
                    <div className="relative">
                       <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={14} />
                       <input 
                         type="text" 
                         placeholder="Ex: MYSHOP123"
                         className="w-full bg-white border border-sky-100 rounded-xl py-2.5 pl-10 pr-4 font-black text-xs tracking-widest outline-none focus:border-sky-300 transition-all uppercase"
                         value={shopPermissions.storeCode}
                         onChange={e => setShopPermissions({ ...shopPermissions, storeCode: e.target.value.toUpperCase() })}
                       />
                    </div>
                 </div>

                 {/* Permission Toggles */}
                 <div className="p-3 bg-white/60 rounded-2xl border border-white transition-all hover:bg-white/90">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-gray-900 font-black uppercase tracking-wide">Inventory Access</p>
                      <button 
                        onClick={() => setShopPermissions(prev => ({ ...prev, canManageInventory: !prev.canManageInventory }))}
                        className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${shopPermissions.canManageInventory ? 'bg-sky-500 justify-end' : 'bg-gray-300 justify-start'}`}
                      >
                         <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Grant Adding/Editing Products</p>
                 </div>

                 <div className="p-3 bg-white/60 rounded-2xl border border-white transition-all hover:bg-white/90">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-gray-900 font-black uppercase tracking-wide">Customer Data</p>
                      <button 
                        onClick={() => setShopPermissions(prev => ({ ...prev, canViewCustomers: !prev.canViewCustomers }))}
                        className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${shopPermissions.canViewCustomers ? 'bg-sky-500 justify-end' : 'bg-gray-300 justify-start'}`}
                      >
                         <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Visibility of Store Buyers</p>
                 </div>

                 {/* Update Button */}
                 <button 
                   onClick={handleGlobalConfigSave}
                   disabled={isUpdatingShop}
                   className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isUpdatingShop ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                    Sync Authority
                 </button>
              </div>
           </div>
        </div>

        {/* List Column - Premium Deck */}
        <div className="flex-1 flex flex-col min-h-0 md:overflow-hidden">
          <div className="space-y-4 flex-1 overflow-y-auto md:pr-4 custom-scrollbar pb-10 md:pb-0">
            {staffList.length === 0 && (
               <div className="bg-white rounded-[40px] p-10 md:p-20 border border-dashed border-indigo-100 flex flex-col items-center justify-center text-center">
                  <div className="w-16 md:w-20 h-16 md:h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-200 mb-6">
                     <Shield size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">No Staff Members</h3>
                  <p className="text-xs text-gray-400 font-medium max-w-[200px]">Add your first operational assistant to get started.</p>
               </div>
            )}
            
            {staffList.map((staff) => (
            <div key={staff._id} className="group bg-white rounded-[32px] p-4 md:p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 hover:scale-[1.01] gap-4">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="relative shrink-0">
                  <div className={`w-14 md:w-16 h-14 md:h-16 rounded-[22px] flex items-center justify-center text-xl font-black transition-transform group-hover:rotate-3 shadow-md border-4 border-white ${
                    staff.status === 'active' ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-xl border-4 border-white shadow-sm flex items-center justify-center ${
                    staff.status === 'active' ? 'bg-sky-500' : 'bg-rose-500'
                  }`}>
                    {staff.status === 'active' ? <UserCheck size={10} className="text-white" /> : <Lock size={10} className="text-white" />}
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-gray-900 uppercase tracking-wide text-md md:text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors truncate">{staff.name}</h4>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                      <Smartphone size={10} className="text-gray-400" />
                      <span className="text-[9px] md:text-[10px] font-black text-gray-600">{staff.phone}</span>
                    </div>
                    <div className={`px-2 md:px-3 py-1 rounded-full flex items-center gap-2 border shadow-sm transition-all ${
                      staff.status === 'active' ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${staff.status === 'active' ? 'bg-sky-500 animate-pulse' : 'bg-rose-400'}`} />
                       <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{staff.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 md:gap-4">
                <div className="flex items-center bg-gray-50/50 p-1 rounded-[22px] border border-gray-100">
                  <button 
                    onClick={() => openEditModal(staff)}
                    className="p-2.5 md:p-3 bg-white rounded-2xl text-gray-400 hover:text-indigo-600 transition-all hover:shadow-md border border-transparent hover:border-indigo-100 flex items-center gap-2 group/btn"
                  >
                    <Eye size={16} />
                    <span className="text-[9px] font-black uppercase hidden md:inline ml-1">Edit</span>
                  </button>
                  <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                  <button 
                    onClick={() => toggleStatus(staff)}
                    className={`px-3 md:px-4 py-2.5 md:py-3 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 group/status ${
                      staff.status === 'active' ? 'text-rose-400 hover:text-rose-600' : 'text-sky-400 hover:text-sky-600'
                    }`}
                  >
                    {staff.status === 'active' ? <Lock size={14} /> : <UserCheck size={14} />}
                    {staff.status === 'active' ? 'Freeze' : 'Release'}
                  </button>
                </div>
                
                <button 
                  onClick={() => handleDeleteStaff(staff.id)}
                  className="w-10 md:w-12 h-10 md:h-12 rounded-[20px] flex items-center justify-center text-gray-200 hover:text-rose-500 hover:bg-rose-50 transition-all group/del"
                >
                  <Trash2 size={20} className="group-hover/del:scale-110 transition-transform" />
                </button>
              </div>
            </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <div>
                 <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{editingStaff ? 'Update Identity' : 'New Assistant'}</h2>
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{editingStaff ? 'Modify Staff Credentials' : 'Grant New Store Access'}</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><XCircle size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-4 md:space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-5">Personnel Name</label>
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input required placeholder="Assistant Name" className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 md:py-5 pl-14 pr-6 font-bold text-sm focus:border-indigo-100 focus:bg-white focus:ring-4 ring-indigo-50/50 transition-all outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-5">Identity (Mobile)</label>
                  <div className="relative group">
                    <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input required maxLength="10" placeholder="10 Digit Login ID" className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 md:py-5 pl-14 pr-6 font-bold text-sm focus:border-indigo-100 focus:bg-white focus:ring-4 ring-indigo-50/50 transition-all outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2 opacity-80">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-5 flex items-center gap-2">
                    <Mail size={12} /> Generated Login Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400 transition-colors" size={18} />
                    <input readOnly placeholder="Enter phone to generate email" className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-[24px] py-4 md:py-5 pl-14 pr-6 font-bold text-sm text-indigo-700 outline-none cursor-not-allowed" value={formData.phone ? `${formData.phone}@staff.zengalla.com` : ''} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{editingStaff ? 'New Authority Key' : 'Authority Key'}</label>
                    <div className="flex flex-col items-end">
                      {editingStaff && !formData.password && <span className="text-[8px] font-bold text-indigo-300 uppercase underline decoration-indigo-100 underline-offset-4">Keep empty to retain</span>}
                      {formData.password && (
                        <span className={`text-[8px] font-black uppercase tracking-widest ${passStrength.isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {passStrength.isValid ? `✓ ${passStrength.label}` : passStrength.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative group">
                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                       required={!editingStaff}
                       type={showPassword ? "text" : "password"} 
                       placeholder={editingStaff ? "••••••••" : "Store Auth Password"} 
                       className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 md:py-5 pl-14 pr-14 font-bold text-sm focus:border-indigo-100 focus:bg-white focus:ring-4 ring-indigo-50/50 transition-all outline-none" 
                       value={formData.password} 
                       onChange={e => setFormData({...formData, password: e.target.value})} 
                    />
                    <button 
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-600 transition-all hover:scale-110"
                    >
                       {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !isPassValid}
                className="w-full h-16 md:h-18 py-4 md:py-5 bg-sky-600 text-white rounded-[28px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-sky-100 hover:bg-sky-700 hover:shadow-sky-200 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (editingStaff ? <Check size={20} strokeWidth={3} /> : <UserPlus size={20} />)}
                {editingStaff ? 'Commit Changes' : 'Grant Store Access'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
