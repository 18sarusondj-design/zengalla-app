import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { Store, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Logo from '../../common/components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';

  useEffect(() => {
    if (user) {
      if (user.role === 'vendor') {
        if (user.status === 'active') {
          navigate('/vendor/dashboard', { replace: true });
        } else {
          navigate('/vendor/pending', { replace: true });
        }
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
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
        if (result.user?.role === 'vendor') {
          logout(true); // Silent logout
          toast.error('Vendors must use the Business Portal to login.', { 
            id: toastId,
            duration: 5000,
            action: {
              label: "Portal Login",
              onClick: () => navigate('/vendor-login')
            }
          });
          return;
        }
        toast.success('Successfully logged in!', { id: toastId });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message || 'Login failed', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans relative">
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
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-10 max-w-xs">
              Welcome back to Zengalla. Your premium marketplace experience awaits.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col relative bg-slate-50">
        
        {/* Mobile Hero Banner */}
        <div className="lg:hidden relative h-64 flex-shrink-0 overflow-hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-900/70 via-sky-900/40 to-slate-50" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-4">
              <Logo className="h-14" variant="full" white />
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">ZenGalla</h2>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mt-1">Nature • Balance • Tranquility</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
          <div className="w-full max-w-[420px]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-14 w-14 bg-sky-500 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-100 border border-sky-400 mb-4">
                <Logo className="h-10" variant="icon" white />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Welcome Back</h1>
            </div>

            <div className="bg-white py-6 px-8 sm:px-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[40px] border border-gray-100 flex flex-col gap-6 relative overflow-hidden group">
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
                  className="w-full h-14 bg-gray-900 text-white rounded-[24px] shadow-2xl shadow-gray-200 hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group hover:shadow-sky-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>Sign in to Account <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
                
                <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  No account? <Link to="/register" className="text-sky-600 font-black hover:underline underline-offset-4 decoration-2">Get Started</Link>
                </p>
              </form>

              <div className="pt-3 border-t border-gray-50">
                <div className="bg-slate-900 p-4 rounded-[24px] border border-slate-800 shadow-2xl relative overflow-hidden group">
                   {/* Security Background Pattern */}
                   <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                   
                   <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 border border-sky-500/20">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <h3 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Secure Business Node</h3>
                          <p className="text-[7px] text-sky-400/70 font-bold mt-1 tracking-tight uppercase">Authorized Personnel Only</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[6px] font-black text-emerald-400 uppercase tracking-tighter">Encrypted</span>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 relative z-10">
                     <Link 
                       to="/vendor-login"
                       className="h-9 bg-slate-800 text-white border border-slate-700 rounded-xl flex items-center justify-center text-[7px] font-black uppercase tracking-widest hover:bg-slate-700 hover:border-sky-500 transition-all active:scale-95"
                     >
                       Portal Login
                     </Link>
                     <Link 
                       to="/vendor-signup"
                       className="h-9 bg-sky-600 text-white rounded-xl flex items-center justify-center text-[7px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-900/20 active:scale-95"
                     >
                       Register Node
                     </Link>
                   </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-[8px] text-gray-300 font-medium uppercase tracking-[0.2em]">
              Powered by Zengalla Infrastructure
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

export default Login;
