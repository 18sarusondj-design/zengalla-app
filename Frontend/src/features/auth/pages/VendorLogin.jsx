import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { 
  Store, Mail, Lock, Loader2, ArrowRight, 
  ShieldCheck, Truck, Eye, EyeOff, KeyRound 
} from 'lucide-react';
import { toast } from 'sonner';
import Logo from '../../common/components/Logo';

const VendorLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const role = user.role?.toLowerCase();
    
    if (role === 'vendor' || role === 'staff') {
      navigate('/vendor/dashboard');
    } else if (role === 'admin') {
      navigate('/superadmin/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Opening Vendor Terminal...');
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Vendor Portal Authenticated', { id: toastId });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed', { id: toastId });
    }
  };

  if (user && user.role?.toLowerCase() === 'customer') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Access Restricted</h2>
          <p className="text-sm text-gray-500 font-medium">You are currently logged in as a customer. Please use a vendor account to access this portal.</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition-all shadow-xl"
          >
            Try different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex font-sans relative">
      {/* Left Side: Brand Imagery */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
        <img 
          src="/brand_login.png" 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Vendor Branding"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 via-gray-900/60 to-transparent flex flex-col justify-end p-12">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 flex items-center justify-center mb-8 transform -rotate-3">
              <Logo className="w-20 h-20" variant="full" white />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4 leading-none">Business<br/>Operations.</h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-10 max-w-xs">
              Manage your shop, track orders, and grow your digital presence with Zengalla's powerful vendor tools.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col relative bg-slate-50">
        
        {/* Mobile Hero Banner */}
        <div className="lg:hidden relative h-52 flex-shrink-0 overflow-hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Vendor Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/50 to-slate-50" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-3">
              <Logo className="h-12" variant="full" white />
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">ZenGalla</h2>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Business Operations Hub</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
          <div className="w-full max-w-[420px]">
            <div className="hidden lg:flex flex-col items-center text-center mb-4">
              <Logo className="h-10 mb-2" />
              <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-1">Vendor Portal</h1>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] opacity-70">Zengalla Business Node</p>
            </div>

            <div className="bg-white py-6 px-8 sm:px-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[40px] border border-gray-100 flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-[2.5] group-hover:rotate-12 transition-transform duration-1000">
                <Logo variant="icon" className="w-32 h-32" />
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <FormInput 
                    label="Business Email" 
                    icon={<Mail size={20} />} 
                    type="email" 
                    placeholder="" 
                    value={email}
                    onChange={setEmail}
                  />
                  
                  <div className="relative">
                    <FormInput 
                      label="Access Password" 
                      icon={<Lock size={20} />} 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password}
                      onChange={setPassword}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-sky-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-gray-900 text-white rounded-[24px] shadow-2xl shadow-gray-200 hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group hover:shadow-sky-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>Verify & Enter Hub <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>

                <div className="flex items-center gap-4 py-2 opacity-50">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">OR</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/staff-login"
                    className="h-12 border border-gray-100 rounded-xl hover:border-sky-500/30 hover:bg-sky-50/20 transition-all flex items-center justify-center gap-2 text-gray-900 font-black uppercase tracking-widest text-[8px] active:scale-95"
                  >
                    <ShieldCheck size={14} className="text-sky-500" /> Staff
                  </Link>

                  <Link
                    to="/delivery-login"
                    className="h-12 border border-gray-100 rounded-xl hover:border-sky-500/30 hover:bg-sky-50/20 transition-all flex items-center justify-center gap-2 text-gray-900 font-black uppercase tracking-widest text-[8px] active:scale-95"
                  >
                    <Truck size={14} className="text-sky-500" /> Delivery
                  </Link>
                </div>
              </form>

              <div className="mt-1 text-center pt-4 border-t border-gray-50">
                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
                   New to ZenGalla?{' '}
                   <Link to="/vendor-signup" className="text-sky-600 hover:text-sky-700 transition-colors underline decoration-2 underline-offset-4 block mt-1 text-[9px]">
                     Register Business
                   </Link>
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-[8px] text-gray-300 font-medium uppercase tracking-[0.2em]">
              Zengalla Node v2.4.0 • Secured
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, icon, type, placeholder, value, onChange, rightElement }) => (
  <div className="group/input">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 group-focus-within/input:text-sky-600 transition-colors">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-sky-500 transition-colors">
        {React.cloneElement(icon, { strokeWidth: 2.5 })}
      </div>
      <input
        type={type} required
        className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-50 rounded-[22px] bg-gray-50/50 text-xs font-bold text-gray-800 focus:outline-none focus:border-sky-500/30 focus:bg-white transition-all placeholder:text-gray-300 shadow-inner"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {rightElement}
    </div>
  </div>
);

export default VendorLogin;
