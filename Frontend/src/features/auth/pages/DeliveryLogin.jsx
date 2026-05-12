import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Shield, User, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import { useAuth } from '../../auth/context/AuthContext';
import Logo from '../../common/components/Logo';

const DeliveryLogin = () => {
  const [step, setStep] = useState(1); // 1: Enter Store Code, 2: Select Delivery, 3: Enter Password
  const [storeCode, setStoreCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleFetchDelivery = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.get(`/shops/lookup?code=${storeCode}`);
      
      if (!data.success) throw new Error(data.error || 'Invalid code');

      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSelect = (partner) => {
    setSelectedPartner(partner);
    setStep(3);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Authenticating Delivery Node...');
    try {
      const result = await login(email, password);

      if (!result.success) throw new Error(result.error);

      toast.success('Shift initiated successfully', { id: toastId });
      navigate('/vendor/dashboard/delivery');
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
          alt="Delivery Branding"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sky-900/90 via-sky-900/40 to-transparent flex flex-col justify-end p-12">
          <div className="animate-fade-in-up">
            <div className="w-16 h-16 bg-white text-sky-600 rounded-2xl flex items-center justify-center shadow-2xl mb-8 transform -rotate-3">
              <Truck size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4 leading-none">Logistics<br/>Network.</h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-10 max-w-xs">
              Delivery partner portal for order tracking, route optimization, and shift management with Zengalla.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Delivery Login Form */}
      <div className="flex-1 flex flex-col relative bg-slate-50">
        
        {/* Mobile Hero Banner */}
        <div className="lg:hidden relative h-48 flex-shrink-0 overflow-hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Delivery Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-900/80 via-sky-900/50 to-slate-50" />
          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex items-center gap-3">
              <Logo className="h-12" variant="icon" />
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">ZenGalla</h2>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Logistics Network</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white py-10 px-8 sm:px-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[40px] border border-gray-100 relative overflow-hidden group">
              
              <div className="flex flex-col items-center mb-8">
                <Logo className="h-16 mx-auto mb-4" variant="icon" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Logistics Entry</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Zengalla Delivery Portal
                </p>
              </div>

              {step === 1 && (
                <form onSubmit={handleFetchDelivery} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Delivery Access Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Shield size={18} strokeWidth={2.5} className="text-sky-500" />
                      </div>
                      <input
                        type="text" required
                        placeholder=""
                        className="block w-full pl-12 pr-4 py-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xs font-bold focus:outline-none focus:border-sky-300 focus:bg-white transition-all shadow-inner uppercase"
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
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Assignment Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <User size={18} strokeWidth={2.5} className="text-sky-500" />
                      </div>
                      <input
                        type="email" required
                        placeholder="your@email.com"
                        className="block w-full pl-12 pr-4 py-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xs font-bold focus:outline-none focus:border-sky-300 focus:bg-white transition-all shadow-inner"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Secure Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Lock size={18} strokeWidth={2.5} className="text-sky-500" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'} required
                        placeholder="••••••••"
                        className="block w-full pl-12 pr-12 py-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xs font-bold focus:outline-none focus:border-sky-500/30 focus:bg-white transition-all shadow-inner"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-sky-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full h-14 bg-sky-600 rounded-2xl shadow-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-4 text-white font-black uppercase tracking-widest text-[10px] active:scale-95"
                  >
                    {loading ? <Loader2 className="animate-spin" size={12} /> : <>Initiate Duty <ArrowRight size={16} /></>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-center py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                  >
                    Wrong access code? Go back
                  </button>
                </form>
              )}

              <div className="mt-8 text-center pt-8 border-t border-gray-50">
                <Link to="/staff-login" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-sky-600 transition-all">
                  Staff Login Instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;
