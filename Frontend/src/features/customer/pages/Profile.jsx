import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, LogOut, ArrowLeft, Mail, Phone, Settings, Save,
  HelpCircle, Eye, EyeOff, ChevronRight, IndianRupee,
  ShoppingCart, Wallet, MapPin, X, Navigation, Store
} from 'lucide-react';
import CustomerReportModal from '../components/CustomerReportModal';
import { toast } from 'sonner';
import { useStore } from '../../shop/context/StoreContext';
import { getPasswordStrength } from '../../../utils/passwordStrength';
import api from '../../../config/api.js';
import SEO from '../../common/components/SEO';
import LeafletMap from '../../common/components/LeafletMap';
import PWAInstallButton from '../../common/components/PWAInstallButton';
import DeliveryLocationModal from '../components/DeliveryLocationModal';

const Profile = () => {
  const { user, token, logout, refreshUser, updateProfile } = useAuth();
  const { totalCartItemCount } = useStore();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    if (isWalletModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isWalletModalOpen]);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: '',
    deliveryModeEnabled: user?.deliveryModeEnabled ?? true,
    location: user?.location?.coordinates ? {
      lat: user.location.coordinates[1],
      lng: user.location.coordinates[0]
    } : null,
    address: user?.address || '',
    pincode: user?.pincode || ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [creditOrders, setCreditOrders] = useState([]);
  const passStrength = getPasswordStrength(formData.password);
  const isPassValid = !formData.password || passStrength.isValid;

  useEffect(() => {
    if (token && user) fetchCredits();
  }, [token, user]);

  const fetchCredits = async () => {
    if (!user?.id) return;
    try {
      refreshUser();
      const { data } = await api.get('/orders/my');
      if (data?.orders) {
        setCreditOrders(data.orders.filter(o =>
          (o.balanceDue && o.balanceDue > 0) ||
          ['PARTIAL', 'PENDING', 'CREDIT'].includes(o.paymentStatus)
        ));
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Updating profile...');
    try {
      const result = await updateProfile({
        name: formData.name,
        phone: formData.phone,
        deliveryModeEnabled: formData.deliveryModeEnabled,
        location: formData.location ? {
          type: 'Point',
          coordinates: [formData.location.lng, formData.location.lat]
        } : undefined,
        address: formData.address,
        pincode: formData.pincode
      });
      
      if (!result.success) throw new Error(result.error || 'Failed to update profile');

      if (formData.password) {
        await api.put('/auth/password', { password: formData.password });
      }

      setIsEditing(false);
      setFormData(prev => ({ ...prev, password: '' }));
      toast.success('Profile updated successfully', { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationConfirm = async (data) => {
    const toastId = toast.loading('Updating delivery point...');
    try {
      const result = await updateProfile({
        location: {
          type: 'Point',
          coordinates: [data.lng, data.lat]
        },
        address: data.address,
        pincode: data.pincode
      });
      if (result.success) {
        toast.success('Location & Address updated!', { id: toastId });
        setIsLocationModalOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const totalDues = creditOrders.reduce((s, o) => s + (o.balanceDue || o.totalPrice || 0), 0);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  if (!user) return (
    <div className="flex flex-col h-screen items-center justify-center p-6 text-center"
      style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-5 border border-white/10">
        <User className="w-10 h-10 text-white/40" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Not Logged In</h2>
      <p className="text-white/50 mb-6 text-sm">Please login to view your profile.</p>
      <button onClick={() => navigate('/login')}
        className="px-8 py-3 bg-sky-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-sky-500/20">
        Go to Login
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <SEO 
        title="My Profile" 
        description="Manage your ZenGalla account, view wallet balance, and track orders."
        canonical="/profile"
      />

      <div className="w-full sticky top-0 z-50 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle,#fb923c 0%,transparent 70%)', transform: 'translate(35%,-55%)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle,#818cf8 0%,transparent 70%)', transform: 'translate(-35%,55%)' }} />

        <div className="relative flex items-center justify-between px-4 sm:px-8 pt-4 pb-2">
          <button onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center transition-all">
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.35em]">My Profile</p>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/cart')}
              className="relative w-9 h-9 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center transition-all">
              <ShoppingCart size={16} />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#0f172a]">
                  {Math.floor(totalCartItemCount)}
                </span>
              )}
            </button>
            <button onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/30 text-rose-300 hover:text-white rounded-full flex items-center justify-center transition-all">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <div className="relative px-4 sm:px-8 pt-4 pb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-fit">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[22px] sm:rounded-[26px] flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#0f172a]" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate leading-none mb-2">
              {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[8px] font-black text-white/50 bg-white/10 border border-white/10 px-3 py-1 rounded-full uppercase tracking-widest">
                {user.role}
              </span>
              <span className="text-[8px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                ● Active
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 shrink-0">
            {user.role === 'customer' && (
              <>
                <div className="text-right">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Wallet</p>
                  <p className="text-lg font-black text-white">₹{(user.walletBalance || 0).toLocaleString()}</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-right">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Dues</p>
                  <p className={`text-lg font-black ${totalDues > 0 ? 'text-rose-400' : 'text-white'}`}>
                    ₹{totalDues.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isEditing ? (
          <form onSubmit={handleUpdateProfile}
            className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Edit Profile</h2>
              <button type="button" onClick={() => setIsEditing(false)}
                className="text-[9px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-widest transition-colors">
                Cancel
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                <input type="text" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-sky-400 focus:bg-white outline-none transition-all" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                <input type="text" maxLength="10" placeholder="9876543210" value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-sky-400 focus:bg-white outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                  <span>New Password <span className="text-gray-300">(optional)</span></span>
                  {formData.password && (
                    <span className={`font-black ${passStrength.isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {passStrength.isValid ? `✓ ${passStrength.label}` : passStrength.label}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Leave blank to keep current"
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full bg-gray-50 border-2 rounded-2xl px-4 py-3 pr-12 text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all ${formData.password && !isPassValid ? 'border-rose-300' : 'border-gray-100 focus:border-sky-400'}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-sky-500 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.password && !passStrength.isValid && (
                  <p className="text-[10px] text-rose-500 mt-1.5 font-bold">Min 8 chars with letters, numbers or symbols</p>
                )}
              </div>

              <button type="submit" disabled={loading || !isPassValid}
                className="w-full flex justify-center items-center gap-2 bg-sky-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-500/25 hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 transition-all hover:bg-sky-600">
                <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-3 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl p-4 text-white shadow-md relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-white/10 rounded-full" />
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <Mail size={14} className="text-white" />
                  </div>
                  <p className="text-[7px] font-black text-indigo-200 uppercase tracking-widest mb-1">Email</p>
                  <p className="text-[11px] font-black text-white break-all leading-tight">{user.email}</p>
                </div>
                <div className="rounded-3xl p-4 text-white shadow-md relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-white/10 rounded-full" />
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <Phone size={14} className="text-white" />
                  </div>
                  <p className="text-[7px] font-black text-sky-200 uppercase tracking-widest mb-1">Phone</p>
                  <p className="text-sm font-black text-white leading-tight">{user.phone || 'Not Linked'}</p>
                </div>
              </div>

              {user.role === 'customer' && (
                <>
                  <div 
                    onClick={() => setIsWalletModalOpen(true)}
                    className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700"
                      style={{ background: 'radial-gradient(circle,#fff 0%,transparent 70%)', transform: 'translate(25%,-25%)' }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-emerald-100/60 uppercase tracking-widest mb-1">Total Wallet Balance</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          ₹{(user.walletBalance || 0).toLocaleString()}
                        </h3>
                        <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-1">Tap to see shop breakdown</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                        <Wallet size={22} className="text-white" />
                      </div>
                    </div>
                  </div>

                  <button onClick={() => navigate('/dues')}
                    className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden w-full text-left hover:scale-[1.01] active:scale-[0.99] transition-all"
                    style={{ background: 'linear-gradient(135deg,#f43f5e,#be185d)' }}>
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20"
                      style={{ background: 'radial-gradient(circle,#fff 0%,transparent 70%)', transform: 'translate(25%,-25%)' }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-rose-100/60 uppercase tracking-widest mb-1">Pending Dues</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          ₹{totalDues.toLocaleString()}
                        </h3>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <IndianRupee size={22} className="text-white" />
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Saved Location</p>
                    <h3 className="text-[11px] font-black text-gray-900 uppercase leading-snug">
                      {user.address || 'Delivery Point'}
                    </h3>
                    {user.pincode && (
                      <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mt-0.5">{user.pincode}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 shrink-0">
                    <MapPin size={18} />
                  </div>
                </div>
                <div 
                  className="rounded-2xl overflow-hidden h-48 border border-gray-50 cursor-pointer relative group"
                  onClick={() => setIsLocationModalOpen(true)}
                >
                  {user.location?.coordinates ? (
                    <>
                      <LeafletMap 
                        height="100%" 
                        userCoords={{ 
                          lat: user.location.coordinates[1], 
                          lng: user.location.coordinates[0] 
                        }} 
                        autoDetect={false}
                        interactive={false}
                        showSatellite={true}
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                          <Navigation size={16} className="text-sky-600 animate-bounce" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Open Fullscreen Editor</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full bg-gray-50 flex items-center justify-center text-center p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No location set. Tap to set your delivery point.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {[
                  {
                    icon: <Settings size={17} />,
                    bg: 'bg-sky-50', color: 'text-sky-500', hover: 'group-hover:bg-sky-500',
                    title: 'Account Settings', sub: 'Update name, phone or password',
                    action: () => setIsEditing(true),
                  },
                  {
                    icon: <HelpCircle size={17} />,
                    bg: 'bg-rose-50', color: 'text-rose-500', hover: 'group-hover:bg-rose-500',
                    title: 'Support & Help', sub: 'Report an issue or get assistance',
                    action: () => setIsReportModalOpen(true),
                  },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="w-full p-4 sm:p-5 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group border-b border-gray-50 last:border-0 text-left">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 ${item.bg} ${item.color} ${item.hover} group-hover:text-white rounded-2xl flex items-center justify-center transition-all shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm">{item.title}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">{item.sub}</p>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
              <div className="h-24" />
            </div>
          </div>
        )}
      </div>

      <CustomerReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} shopName="General Support" />
      
      <DeliveryLocationModal 
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        initialCoords={user.location?.coordinates ? {
          lat: user.location.coordinates[1],
          lng: user.location.coordinates[0]
        } : null}
        onConfirm={handleLocationConfirm}
      />

      {/* Wallet Breakdown Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 isolation-auto">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsWalletModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-emerald-600 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-1">Funds Ledger</p>
                  <h3 className="text-3xl font-black tracking-tighter">Shop Balances</h3>
                  <p className="text-xs text-emerald-50/60 font-medium mt-1">Breakdown of your available credit across stores</p>
               </div>
               <button onClick={() => setIsWalletModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
                  <X size={20} />
               </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
               {user.shopBalances && user.shopBalances.length > 0 ? (
                 <div className="space-y-3">
                    {user.shopBalances.map((b, i) => (
                      <div key={i} className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex items-center justify-between hover:border-emerald-200 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                               <Store size={20} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Store Credit</p>
                               <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{b.shopId?.name || 'Local Shop'}</h4>
                               <p className="text-[9px] text-slate-400 font-medium truncate max-w-[180px]">{b.shopId?.address || 'Area Location'}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-xl font-black text-emerald-600 tracking-tighter">₹{b.balance.toLocaleString()}</p>
                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Available</p>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                       <Wallet size={32} />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">No Shop Credits</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Your wallet is unified or empty</p>
                 </div>
               )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
               <button onClick={() => setIsWalletModalOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">
                  Understood
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
