import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { Phone, Lock, Loader2, ArrowRight } from 'lucide-react';
import Logo from '../../common/components/Logo';

const DeliveryLogin = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
  const [cooldown, setCooldown] = useState(0);
  const { sendLoginOtp, verifyLoginOtp, loading, user } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/delivery/dashboard';

  useEffect(() => {
    if (user) {
      if (user.role === 'delivery') {
        navigate('/delivery/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!phone || phone.length < 10) return toast.error('Please enter a valid phone number');
    
    setLocalLoading(true);
    const result = await sendLoginOtp(phone);
    setLocalLoading(false);
    
    if (result.success) {
      toast.success('OTP sent to your phone number!');
      setStep(2);
      setCooldown(30);
    } else {
      toast.error(result.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return toast.error('Please enter the 6-digit OTP');
    
    setLocalLoading(true);
    const result = await verifyLoginOtp(phone, otp);
    setLocalLoading(false);
    
    if (result.success) {
      toast.success('Logged in successfully!');
    } else {
      toast.error(result.error || 'Invalid OTP');
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
        
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900 via-emerald-900/40 to-transparent flex flex-col justify-end p-16">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 flex items-center justify-center mb-8 transform -rotate-3 bg-emerald-500 rounded-2xl shadow-2xl">
              <Logo className="w-12 h-12" variant="icon" white />
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase mb-4 leading-[0.85]">Deliver.<br/>Earn.<br/>Grow.</h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-10 max-w-xs">
              Join the Grozy fleet. Your journey to success starts here.
            </p>
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
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/80 via-emerald-900/40 to-slate-50" />
          <div className="absolute bottom-3 left-6 right-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl shadow-lg">
                 <Logo className="h-5 w-5" variant="icon" white />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Grozy Fleet</h2>
                <p className="text-[8px] font-black text-white/70 uppercase tracking-widest mt-1">Deliver • Earn • Grow</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-4 px-4 sm:px-6 overflow-hidden">
          <div className="w-full max-w-[420px] z-10 w-full">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-xl shadow-emerald-100 border border-emerald-400 mb-3">
            <Logo className="h-8" variant="icon" white />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Delivery Partner Login</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Log in with your phone number</p>
        </div>

        <div className="bg-white py-6 px-6 sm:px-10 shadow-2xl rounded-[32px] border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
          
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <FormInput 
                label="Registered Phone Number" 
                icon={<Phone size={20} />} 
                type="tel" 
                placeholder="10-digit number" 
                value={phone}
                onChange={setPhone}
              />

              <button
                type="submit"
                disabled={localLoading || loading}
                className="w-full h-14 bg-sky-500 text-white rounded-[24px] shadow-2xl hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group"
              >
                {localLoading || loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>Send OTP <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">OTP sent to +91 {phone}</p>
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="text-[9px] text-sky-500 font-black uppercase hover:underline mt-1"
                >
                  Change Number
                </button>
              </div>

              <FormInput 
                label="Enter 6-Digit OTP" 
                icon={<Lock size={20} />} 
                type="text" 
                placeholder="••••••" 
                value={otp}
                onChange={setOtp}
              />

              <button
                type="submit"
                disabled={localLoading || loading}
                className="w-full h-14 bg-sky-500 text-white rounded-[24px] shadow-2xl shadow-sky-200 hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group"
              >
                {localLoading || loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>Verify & Login <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>

              <div className="text-center">
                <button 
                  type="button"
                  disabled={cooldown > 0 || localLoading}
                  onClick={handleSendOtp}
                  className="text-[10px] font-black uppercase tracking-widest text-sky-500 disabled:text-gray-400"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-gray-50">
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Want to join our fleet? <Link to="/delivery/register" className="text-sky-500 font-black hover:underline underline-offset-4 decoration-2">Apply Now</Link>
            </p>
          </div>
          
          {/* Removed cross-portal links */}

        </div>
      </div>
    </div>
  </div>
</div>
  );
};

const FormInput = ({ label, icon, type, placeholder, value, onChange }) => (
  <div className="group/input">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 group-focus-within/input:text-emerald-600 transition-colors">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-emerald-500 transition-colors">
        {React.cloneElement(icon, { strokeWidth: 2.5 })}
      </div>
      <input
        type={type} required
        className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-50 rounded-[22px] bg-gray-50/50 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-500/30 focus:bg-white transition-all placeholder:text-gray-300 shadow-inner"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  </div>
);

export default DeliveryLogin;
