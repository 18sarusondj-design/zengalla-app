import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { Store, Mail, Lock, Phone, User, CheckCircle2, ArrowRight, Loader2, ShieldCheck, Smartphone, Eye, EyeOff, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '../../common/components/Logo';

const Register = () => {
  const [step, setStep] = useState(1);
  const { register, verifyOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: ''
  });

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      return toast.error('Please fill in all required fields');
    }

    setLoading(true);
    const toastId = toast.loading('Creating your secure account...');
    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: 'customer'
      });
      
      if (result.success) {
        if (result.requiresOtp) {
          toast.success('Verification code sent to your email!', { id: toastId });
          setStep(2);
        } else {
          toast.success('Account created successfully! Welcome to Zengalla.', { id: toastId });
          navigate('/login');
        }
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return toast.error('Please enter a valid 6-digit code');
    
    setLoading(true);
    const toastId = toast.loading('Verifying code...');
    
    try {
      const result = await verifyOtp(formData.email, otp);
      if (result.success) {
        toast.success('Email verified successfully! You can now log in.', { id: toastId });
        navigate('/login');
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
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
          alt="Registration Branding"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-end p-12">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 flex items-center justify-center mb-8 transform -rotate-3">
              <Logo className="w-20 h-20" variant="full" white />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4 leading-none">Join the<br/>Community.</h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-10 max-w-xs">
              Create your Zengalla account and start shopping from your favorite local vendors today.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="flex-1 flex flex-col relative bg-slate-50">
        
        {/* Mobile Hero Banner */}
        <div className="lg:hidden relative h-52 flex-shrink-0 overflow-hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Registration Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/50 to-slate-50" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-3">
              <Logo className="h-12" variant="full" white />
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">ZenGalla</h2>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Digital Marketplace</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
          <div className="w-full max-w-[480px]">
            <div className="hidden lg:flex flex-col items-center text-center mb-2">
              <Logo className="h-10 mb-1" />
              <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Get Started</h1>
            </div>

            <div className="bg-white py-4 px-8 sm:px-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[40px] border border-gray-100 flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-[2.5] group-hover:rotate-12 transition-transform duration-1000">
                <Logo variant="icon" className="w-32 h-32" />
              </div>
              {step === 1 ? (
                <form className="space-y-4" onSubmit={handleRegister}>
                  <div className="grid grid-cols-1 gap-4">
                    <FormInput 
                      label="Full Name" 
                      icon={<User size={18} />} 
                      type="text" 
                      placeholder="" 
                      value={formData.name}
                      onChange={(val) => setFormData({...formData, name: val})}
                    />

                    <FormInput 
                      label="Email Address" 
                      icon={<Mail size={18} />} 
                      type="email" 
                      placeholder="" 
                      value={formData.email}
                      onChange={(val) => setFormData({...formData, email: val})}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <FormInput 
                          label="Security Password" 
                          icon={<Lock size={18} />} 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          value={formData.password}
                          onChange={(val) => setFormData({...formData, password: val})}
                          rightElement={
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-sky-600 transition-colors"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          }
                        />
                      </div>
                      <FormInput 
                        label="Phone Number" 
                        icon={<Phone size={18} />} 
                        type="tel" 
                        placeholder="" 
                        value={formData.phone}
                        onChange={(val) => setFormData({...formData, phone: val})}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-gray-900 text-white rounded-[24px] shadow-2xl shadow-gray-200 hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group hover:shadow-sky-200"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>Complete Setup <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleVerifyOtp}>
                  <div className="text-center mb-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      We sent a verification code to
                    </p>
                    <p className="text-sm font-black text-gray-900">{formData.email}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <FormInput 
                      label="Verification Code" 
                      icon={<ShieldCheck size={18} />} 
                      type="text" 
                      placeholder="Enter code" 
                      maxLength={12}
                      value={otp}
                      onChange={(val) => setOtp(val)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 4}
                    className="w-full h-14 bg-sky-600 text-white rounded-[24px] shadow-2xl shadow-sky-200 hover:bg-gray-900 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group hover:shadow-gray-200"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>Verify & Login <CheckCircle2 size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" /></>
                    )}
                  </button>
                </form>
              )}

              <div className="pt-3 border-t border-gray-50 text-center">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  Already a member? <Link to="/login" className="text-sky-600 font-black hover:underline underline-offset-4 decoration-2">Login Now</Link>
                </p>
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

const FormInput = ({ label, icon, type, placeholder, value, onChange, rightElement, maxLength }) => (
  <div className="group/input">
    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1.5 group-focus-within/input:text-sky-600 transition-colors">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-sky-500 transition-colors">
        {React.cloneElement(icon, { strokeWidth: 2.5 })}
      </div>
      <input
        type={type} required
        maxLength={maxLength}
        className={`block w-full pl-10 ${rightElement ? 'pr-12' : 'pr-4'} py-3 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-[10px] font-bold text-gray-800 focus:outline-none focus:border-sky-500/30 focus:bg-white transition-all shadow-inner`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {rightElement}
    </div>
  </div>
);

export default Register;
