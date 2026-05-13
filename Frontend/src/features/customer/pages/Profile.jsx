import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, LogOut, ArrowLeft, Mail, Phone, Settings, Save,
  HelpCircle, Eye, EyeOff, ChevronRight, IndianRupee,
  ShoppingCart, Wallet
} from 'lucide-react';
import CustomerReportModal from '../components/CustomerReportModal';
import { toast } from 'sonner';
import { useStore } from '../../shop/context/StoreContext';
import { getPasswordStrength } from '../../../utils/passwordStrength';
import api from '../../../config/api.js';
import SEO from '../../common/components/SEO';
import PWAInstallButton from '../../common/components/PWAInstallButton';





const Profile = () => {
  const { user: authUser, token, logout, refreshUser, updateProfile } = useAuth();
  const { totalCartItemCount, user: storeUser } = useStore();
  const user = authUser || storeUser;
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: '',
    deliveryModeEnabled: user?.deliveryModeEnabled ?? true
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
    try {
      // Update custom profile data
      const result = await updateProfile({
        name: formData.name,
        phone: formData.phone,
        deliveryModeEnabled: formData.deliveryModeEnabled
      });
      
      if (!result.success) throw new Error(result.error || 'Failed to update profile');

      // Update password if provided
      if (formData.password) {
        await api.put('/auth/password', { password: formData.password });
      }

      setIsEditing(false);
      setFormData(prev => ({ ...prev, password: '' }));
      // Let the success toast come from updateProfile or handle it locally
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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


      {/* ── FULL-WIDTH HEADER ── */}
      <div className="w-full sticky top-0 z-50 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
        {/* Blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle,#fb923c 0%,transparent 70%)', transform: 'translate(35%,-55%)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle,#818cf8 0%,transparent 70%)', transform: 'translate(-35%,55%)' }} />

        {/* Nav row */}
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

        {/* Hero — desktop: sidebar-style, mobile: stacked */}
        <div className="relative px-4 sm:px-8 pt-4 pb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="relative w-fit">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[22px] sm:rounded-[26px] flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#0f172a]" />
          </div>

          {/* Name & meta */}
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

          {/* Desktop quick stats — show only on sm+ */}
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

      {/* ── BODY ── */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {isEditing ? (
          /* ─── EDIT FORM: full width on mobile, centered card on desktop ─── */
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
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3.5">
                <div>
                  <p className="text-sm font-black text-gray-900">Delivery Mode</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Enable home delivery options</p>
                </div>
                <button type="button"
                  onClick={() => setFormData({ ...formData, deliveryModeEnabled: !formData.deliveryModeEnabled })}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.deliveryModeEnabled ? 'bg-sky-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${formData.deliveryModeEnabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <button type="submit" disabled={loading || !isPassValid}
                className="w-full flex justify-center items-center gap-2 bg-sky-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-500/25 hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 transition-all hover:bg-sky-600">
                <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>

            </div>
          </form>
        ) : (
          /* ─── DASHBOARD LAYOUT: 1-col mobile → sidebar+main on desktop ─── */
          <div className="flex flex-col lg:flex-row gap-5">

            {/* LEFT COLUMN */}
            <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-3 shrink-0">

              {/* Contact cards: 2-col always */}
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

              {/* Financial cards: customers only */}
              {user.role === 'customer' && (
                <>
                  {/* Wallet — full width */}
                  <div className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20"
                      style={{ background: 'radial-gradient(circle,#fff 0%,transparent 70%)', transform: 'translate(25%,-25%)' }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-emerald-100/60 uppercase tracking-widest mb-1">Wallet Balance</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          ₹{(user.walletBalance || 0).toLocaleString()}
                        </h3>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Wallet size={22} className="text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-100/70 uppercase tracking-widest">Live Balance</span>
                    </div>
                  </div>

                  {/* Dues — clickable, rose gradient */}
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
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        {creditOrders.length > 0 && <div className="w-1.5 h-1.5 bg-rose-200 rounded-full animate-pulse" />}
                        <span className="text-[8px] font-black text-rose-100/70 uppercase tracking-widest">
                          {creditOrders.length} {creditOrders.length === 1 ? 'Pending Bill' : 'Pending Bills'}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-white/60" />
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* RIGHT COLUMN (actions + logout) */}
            <div className="flex-1 flex flex-col gap-4">

              {/* Action menu */}
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
                
                {/* PWA Install for Mobile */}
                <div className="p-4 sm:p-5 border-t border-gray-50 bg-sky-50/30">
                  <PWAInstallButton variant="sidebar" className="!bg-sky-500 !text-white !border-sky-400 shadow-sky-100" />
                </div>

              </div>


              <div className="h-4" />
            </div>

          </div>
        )}
      </div>

      <CustomerReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} shopName="General Support" />
    </div>
  );
};

export default Profile;
