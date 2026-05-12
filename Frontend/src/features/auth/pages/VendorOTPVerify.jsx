import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../config/supabaseClient';

const VendorOTPVerify = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const email = query.get('email') || '';

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Please enter 6-digit code');
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) throw error;

      toast.success('Email Verified! You can now log in.');
      setTimeout(() => navigate('/vendor-login'), 1500);
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      if (!error) toast.success('New code sent to your email');
      else throw error;
    } catch (err) {
      toast.error(err.message || 'Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-4 px-4 font-sans overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] rounded-[48px] border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none scale-150 group-hover:rotate-45 transition-transform duration-1000">
             <ShieldCheck size={150} />
          </div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-sky-600 text-white rounded-[28px] flex items-center justify-center shadow-xl mx-auto mb-4 transform rotate-3">
              <Mail size={32} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Verify Email</h2>
            <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
              Verification node for {email}
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleVerify}>
            <div className="group/input">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-3">
                6-Digit Security Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300">
                  <ShieldCheck size={20} strokeWidth={2.5} />
                </div>
                <input
                  type="text" required maxLength="6"
                  className="block w-full pl-12 pr-4 py-4 border-2 border-sky-500/10 rounded-2xl bg-sky-50/5 text-xl font-black text-sky-900 tracking-[0.5em] text-center focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-inner"
                  placeholder=""
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-gray-900 rounded-[28px] shadow-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-4 text-white font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>Complete Verification <ArrowRight size={16} strokeWidth={3} /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={handleResend}
              className="text-[9px] font-black text-sky-600 uppercase tracking-widest hover:underline transition-all"
            >
              Didn't receive code? Resend Node
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-50 text-center">
            <Link to="/vendor-signup" className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">
              ← Back to Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorOTPVerify;
