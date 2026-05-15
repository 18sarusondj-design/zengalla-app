import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Key, Mail, Phone, Settings, Save, X, MessageSquare, Loader2, CheckCircle, Eye, EyeOff, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const AdminProfile = () => {
  const { user, token, refreshUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (formData.phone && formData.phone.length !== 10) {
      return toast.error("Please enter a valid 10-digit phone number");
    }

    setLoading(true);
    setIsSuccess(false);
    try {
      // 1. Handle Password Update via API if provided
      if (formData.password) {
        await api.put('/auth/password', { password: formData.password });
      }

      // 2. Handle Profile Update (Name/Phone)
      const result = await updateProfile({
        name: formData.name,
        phone: formData.phone
      });

      if (!result.success) throw new Error(result.error || 'Identity update failed');
      
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      
      await refreshUser();
      
      setIsSuccess(true);
      toast.success('Security profile updated successfully!');
      
      setTimeout(() => setIsSuccess(false), 3000);
      
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error(err.message || 'Identity update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-sky-50/30 p-8 rounded-[48px] border border-sky-100/50 shadow-sm relative overflow-hidden animate-in fade-in duration-500">
      <div className="mb-6 flex-shrink-0 bg-white/60 backdrop-blur-sm sticky top-0 z-10 py-4 -mx-8 -mt-8 px-8 border-b border-sky-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
           {/* Compact Branding Upside */}
           <div className="relative group shrink-0">
             <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-xl flex items-center justify-center text-sky-500">
                <User size={24} className="m-auto" />
             </div>
           </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">{user.name || 'Administrator'}</h1>
              <div className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-200 w-fit">
                 <Shield size={10} className="fill-sky-500 text-white" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Global Admin</span>
              </div>
            </div>
        </div>
        <div className="flex flex-col text-right">
           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Security Level</span>
           <span className="text-xs font-black uppercase tracking-widest text-sky-600">Level 1 Access</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
          {/* LEFT SIDEBAR: Menu */}
          <div className="lg:col-span-1 flex flex-col h-full pb-10 overflow-hidden">
            <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-2 border border-white shadow-xl flex flex-col h-full space-y-1 overflow-hidden">
              <p className="px-4 py-1 text-[9px] font-black text-gray-600 uppercase tracking-widest border-b border-white/30 mb-1">Admin Console</p>
              
              <div className="space-y-1 flex-1 pr-1 overflow-y-auto scrollbar-hide py-1">
                {[
                  { id: 'identity', label: 'Identity Settings', icon: User, color: '#0ea5e9' },
                  { id: 'security', label: 'Access Credentials', icon: Key, color: '#ef4444' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
                      type="button"
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-300 group ${
                        isActive 
                          ? `text-white scale-[1.02] shadow-lg` 
                          : 'text-gray-500 hover:bg-white/60 hover:text-gray-900 border border-transparent'
                      }`}
                      style={isActive ? { backgroundColor: tab.color, boxShadow: `0 10px 15px -3px ${tab.color}33` } : {}}
                    >
                      <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-white/20' : 'bg-gray-100/50 group-hover:bg-white'}`}>
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-wider">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Contact Information block at bottom of menu */}
              <div className="p-4 bg-gray-50/50 rounded-3xl mt-4 space-y-4">
                 <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400">
                    <Mail size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Direct Email</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* RIGHT PANEL: Dynamic Content Forms */}
          <div className="lg:col-span-2 flex flex-col h-full pb-10 overflow-hidden">
            <form onSubmit={handleUpdateProfile} className="h-full flex flex-col">
              <div className="flex-1 min-h-0 bg-white/60 backdrop-blur-md rounded-[40px] shadow-2xl border border-white/50 p-6 overflow-y-auto scrollbar-hide">
                
                {activeTab === 'identity' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                      <Settings className="text-sky-500" size={24} />
                      <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase">Identity Settings</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Administrator Name</label>
                        <input 
                          type="text" required
                          placeholder="Enter full name"
                          className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-2xl p-4 text-xs font-bold text-gray-800 transition-all outline-none shadow-sm"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Secure Phone Contact</label>
                        <input 
                          type="tel" maxLength="10"
                          placeholder="Eg: 9876543210"
                          className="w-full bg-white/80 border-2 border-sky-50 focus:border-sky-400 focus:bg-white rounded-2xl p-4 text-xs font-bold text-gray-800 transition-all outline-none shadow-sm"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                
                {activeTab === 'security' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                     <div className="p-8 bg-red-50/50 border-2 border-red-100 rounded-[40px] shadow-sm space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="p-5 bg-red-600 text-white rounded-[24px] shadow-2xl shadow-red-200">
                            <Key size={28} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h2 className="font-black text-2xl text-gray-900 uppercase tracking-tight leading-none">Security Override</h2>
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mt-2">Authentication Manager</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-red-100/50">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">New Master Password</label>
                              <div className="relative">
                                <input 
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••••••"
                                  className="w-full bg-white border-2 border-red-100 focus:border-red-400 rounded-2xl p-4 pr-12 text-xs font-bold text-gray-800 transition-all outline-none"
                                  value={formData.password}
                                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Confirm New Password</label>
                              <div className="relative">
                                <input 
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••••••"
                                  className="w-full bg-white border-2 border-red-100 focus:border-red-400 rounded-2xl p-4 pr-12 text-xs font-bold text-gray-800 transition-all outline-none"
                                  value={formData.confirmPassword}
                                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 italic ml-1">Leave both password fields blank if you do not wish to change your current password.</p>
                     </div>
                  </div>
                )}
                
              </div>

              {/* ACTION BAR: Bottom Sticky */}
              <div className="mt-8 flex items-center justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => navigate('/super-admin')}
                  className="px-8 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className={`flex items-center justify-center gap-3 px-10 py-4 bg-sky-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-sky-100 active:scale-95 disabled:opacity-50 ${isSuccess ? 'bg-emerald-500 shadow-emerald-100' : ''}`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isSuccess ? (
                    <>Saved Successfully <CheckCircle size={18} /></>
                  ) : (
                    <>Save Profile Changes <Save size={18} /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
