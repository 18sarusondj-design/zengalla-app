import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ShieldCheck, User, Lock, Loader2, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import { useAuth } from '../../auth/context/AuthContext';
import Logo from '../../common/components/Logo';

const StaffLogin = () => {
  const [step, setStep] = useState(1); // 1: Enter Store Code, 2: Select Staff, 3: Password
  const [storeCode, setStoreCode] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [shopName, setShopName] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleFetchStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.get(`/shops/lookup?code=${storeCode}`);
      
      if (!data.success) throw new Error(data.error || 'Invalid store code');

      setStaffList(data.staff || []);
      setShopName(data.shop.name);
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staff) => {
    setSelectedStaff(staff);
    setStep(3);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Authenticating Staff Access...');
    try {
      const result = await login(selectedStaff.email, password);

      if (!result.success) throw new Error(result.error);

      toast.success(`Welcome, ${selectedStaff.name}`, { id: toastId });
      navigate('/vendor/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white flex font-sans relative">
      {/* Left Side: Brand Imagery */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
        <img 
          src="/brand_login.png" 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Staff Branding"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-end p-12">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 flex items-center justify-center mb-8 transform -rotate-3">
              <Logo className="w-20 h-20" variant="full" white />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4 leading-none">Operational<br/>Management.</h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-10 max-w-xs">
              Staff portal for inventory tracking, order processing, and store management with Zengalla.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Staff Login Form */}
      <div className="flex-1 flex flex-col relative bg-slate-50">
        
        {/* Mobile Hero Banner */}
        <div className="lg:hidden relative h-48 flex-shrink-0 overflow-hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Staff Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/50 to-slate-50" />
          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex items-center gap-3">
              <Logo className="h-12" variant="full" white />
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">ZenGalla</h2>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Operations Hub</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
          <div className="w-full max-w-md relative z-10">
            
            <div className="flex flex-col items-center mb-8">
              <Logo className="h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Staff Entry</h2>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                Zengalla Operations Portal
              </p>
            </div>

            <div className="bg-white py-10 px-8 sm:px-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[40px] border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-[2.5] group-hover:rotate-12 transition-transform duration-1000">
                <Logo variant="icon" className="w-32 h-32" />
              </div>
              {step === 1 && (
                <form onSubmit={handleFetchStaff} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Store Access Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Shield size={18} strokeWidth={2.5} className="text-indigo-500" />
                      </div>
                      <input
                        type="text" required
                        placeholder=""
                        className="block w-full pl-12 pr-4 py-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xs font-bold focus:outline-none focus:border-indigo-300 focus:bg-white transition-all shadow-inner uppercase"
                        value={storeCode}
                        onChange={e => setStoreCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    className="w-full h-14 bg-gray-900 rounded-2xl shadow-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-4 text-white font-black uppercase tracking-widest text-[10px] active:scale-95"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <>Verify Store <ArrowRight size={16} /></>}
                  </button>
                </form>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center pb-2 border-b border-gray-50 mb-4">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Store Location:</span>
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-tight">{shopName}</span>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Identify Yourself:</p>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {staffList.map(staff => (
                      <button
                        key={staff._id}
                        onClick={() => handleStaffSelect(staff)}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-indigo-500/20 hover:bg-indigo-50/30 transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border">
                          <User size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{staff.name}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{staff.role || 'Staff Member'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setStep(1)}
                    className="w-full text-center py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                  >
                    Not your store? Go back
                  </button>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="flex flex-col items-center py-4 bg-indigo-50 rounded-3xl border border-indigo-100 mb-2">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 mb-3">
                        <User size={28} />
                      </div>
                      <h3 className="font-black text-gray-900 uppercase tracking-tight">{selectedStaff.name}</h3>
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Secure Credentials Required</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Security Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Lock size={18} strokeWidth={2.5} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'} required
                        placeholder="••••••••"
                        className="block w-full pl-12 pr-12 py-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xs font-bold focus:outline-none focus:border-indigo-500/30 focus:bg-white transition-all shadow-inner"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full h-14 bg-sky-600 rounded-2xl shadow-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-4 text-white font-black uppercase tracking-widest text-[10px] active:scale-95"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <>Verified Entry <ArrowRight size={16} /></>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full text-center py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Not you? Change Staff
                  </button>
                </form>
              )}

              <div className="mt-8 text-center pt-8 border-t border-gray-50">
                <Link to="/vendor-login" className="text-[10px] font-black text-sky-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4 transition-all">
                  Switch to Vendor Owner Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
