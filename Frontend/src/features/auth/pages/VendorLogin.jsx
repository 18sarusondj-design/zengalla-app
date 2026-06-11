import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { Store, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Truck } from 'lucide-react';
import Logo from '../../common/components/Logo';
import PWAInstallButton from '../../common/components/PWAInstallButton';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';

  useEffect(() => {
    if (user) {
      if (user.role === 'vendor') {
        if (user.status === 'active') {
          navigate('/vendor/dashboard', { replace: true });
        } else {
          navigate('/vendor-pending', { replace: true });
        }
      } else if (user.role === 'staff') {
        navigate('/vendor/dashboard', { replace: true });
      } else if (user.role === 'delivery') {
        navigate('/delivery/dashboard', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/super-admin', { replace: true });
      } else {
        const storedRedirect = sessionStorage.getItem('redirectUrl');
        const storedDiscount = sessionStorage.getItem('checkout_discount');
        const storedCouponCode = sessionStorage.getItem('checkout_couponCode');
        
        sessionStorage.removeItem('redirectUrl');
        sessionStorage.removeItem('checkout_discount');
        sessionStorage.removeItem('checkout_couponCode');

        const target = storedRedirect || from;
        const discount = storedDiscount ? Number(storedDiscount) : (location.state?.discount || 0);
        const couponCode = storedCouponCode || location.state?.couponCode || null;

        if (target === '/checkout') {
          navigate(target, { 
            replace: true, 
            state: { 
              discount, 
              couponCode,
              appliedCoupon: couponCode
            } 
          });
        } else {
          navigate(target, { replace: true });
        }
      }
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter all fields');
    
    const toastId = toast.loading('Authenticating...');
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Successfully logged in!', { id: toastId });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message || 'Login failed', { id: toastId });
    }
  };

  return (
    <div className="h-screen bg-white flex font-sans relative overflow-hidden">
      {/* Left Side: Brand Imagery (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src="/brand_login.png" 
          className="absolute inset-0 w-full h-full object-cover scale-105 animate-pulse-slow"
          alt="Branding"
        />
        
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-end p-16">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 flex items-center justify-center mb-8 transform -rotate-3">
              <Logo className="w-20 h-20" variant="full" white />
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase mb-4 leading-[0.85]">Pure<br/>Simplicity.</h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-6 max-w-xs">
              Welcome back to Grozy. Your premium marketplace experience awaits.
            </p>
            <div className="flex justify-start w-fit">
              <PWAInstallButton variant="brand" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col relative bg-slate-50 h-full overflow-hidden">
        
        {/* Mobile Hero Banner */}
        <div className="lg:hidden relative h-44 flex-shrink-0 overflow-hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-900/70 via-sky-900/40 to-slate-50" />
          <div className="absolute bottom-3 left-6 right-6">
            <div className="flex items-center gap-3">
              <Logo className="h-8" variant="icon" white />
              <div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Grozy</h2>
                <p className="text-[8px] font-black text-white/70 uppercase tracking-widest mt-1">Nature • Balance • Tranquility</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-4 px-4 sm:px-6 overflow-hidden">
          <div className="w-full max-w-[420px]">
            <div className="flex flex-col items-center text-center mb-3">
              <div className="h-10 w-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-xl shadow-sky-100 border border-sky-400 mb-2">
                <Logo className="h-6" variant="icon" white />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Vendor Login</h1>
            </div>

            <div className="bg-white py-4 px-6 sm:px-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[32px] border border-gray-100 flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-[2.5] group-hover:rotate-12 transition-transform duration-1000">
                <Logo variant="icon" className="w-32 h-32" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <FormInput 
                    label="Registered Email" 
                    icon={<Mail size={20} />} 
                    type="email" 
                    placeholder="" 
                    value={email}
                    onChange={setEmail}
                  />
                  
                  <div className="relative">
                    <FormInput 
                      label="Security Password" 
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
                    <Link to="/forgot-password" 
                      className="absolute top-0 right-4 text-[9px] font-black text-sky-600 uppercase tracking-widest hover:text-sky-700 transition-colors">
                      Recovery?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 lg:h-14 bg-gray-900 text-white rounded-[20px] lg:rounded-[24px] shadow-2xl shadow-gray-200 hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[9px] lg:text-[10px] active:scale-95 disabled:opacity-50 group hover:shadow-sky-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>Sign in to Account <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>

                <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  No vendor account? <Link to="/vendor/register" state={{ from }} className="text-sky-600 font-black hover:underline underline-offset-4 decoration-2">Register Shop</Link>
                </p>
              </form>

              {/* Removed cross-portal links */}
            </div>

            <p className="mt-3 text-center text-[8px] text-gray-300 font-medium uppercase tracking-[0.2em]">
              Powered by Grozy Infrastructure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, icon, type, placeholder, value, onChange, rightElement }) => (
  <div className="group/input">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 lg:mb-2 group-focus-within/input:text-sky-600 transition-colors">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-sky-500 transition-colors">
        {React.cloneElement(icon, { strokeWidth: 2.5 })}
      </div>
      <input
        type={type} required
        className="block w-full pl-12 pr-4 py-2.5 lg:py-3.5 border-2 border-gray-50 rounded-[18px] lg:rounded-[22px] bg-gray-50/50 text-xs font-bold text-gray-800 focus:outline-none focus:border-sky-500/30 focus:bg-white transition-all placeholder:text-gray-300 shadow-inner"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {rightElement}
    </div>
  </div>
);

export default Login;
