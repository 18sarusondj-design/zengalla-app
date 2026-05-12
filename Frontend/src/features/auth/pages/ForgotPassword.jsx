import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { Store, Mail, Lock, ShieldCheck } from 'lucide-react';
import { getPasswordStrength } from '../../../utils/passwordStrength';


const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword, finalizePasswordReset } = useAuth();
  const navigate = useNavigate();

  const passStrength = getPasswordStrength(newPassword);
  const isPassValid = passStrength.isValid;


  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await resetPassword(email);
    if (res.success) {
      toast.success(res.message || 'OTP sent to your email!');
      setStep(2);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPassValid) return toast.error("Password is not strong enough.");
    
    setLoading(true);
    const res = await finalizePasswordReset(email, otp, newPassword);
    if (res.success) {
      toast.success(res.message || 'Password reset successfully! Please login.');
      navigate('/login');
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand-primary">
          <Store size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <p className="text-sm text-gray-500 text-center">Enter your registered email address and we will send you a 6-digit code to reset your password.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email" required
                    className="focus:ring-brand-primary focus:border-brand-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-xl py-3 bg-gray-50 border"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-primary hover:bg-sky-700 transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </div>
              <div className="text-center text-sm">
                <Link to="/login" className="font-bold text-brand-primary hover:underline">Back to Login</Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6 text-center animate-fade-in" onSubmit={handleResetPassword}>
              <ShieldCheck className="w-12 h-12 text-brand-primary mx-auto mb-2" />
              <p className="text-sm text-gray-500 text-left mb-2">Code sent to <span className="font-bold text-gray-900">{email}</span></p>

              <div>
                  <input
                    type="text" required
                    placeholder=""
                    className="block w-full px-4 py-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xl font-black text-gray-900 tracking-[0.5em] text-center focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-inner"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
              </div>

              <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 flex justify-between">
                  New Password
                  {newPassword && <span className={`text-[10px] uppercase font-bold ${passStrength.isValid ? 'text-sky-600' : 'text-red-500'}`}>{passStrength.isValid ? `✓ ${passStrength.label}` : passStrength.label}</span>}

                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password" required
                    className="focus:ring-brand-primary focus:border-brand-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-xl py-3 bg-gray-50 border"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                {!passStrength.isValid && newPassword.length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1 pl-1">Min 8 chars with letters, numbers or symbols.</p>
                )}

              </div>

              <div className="pt-2">
                <button
                  type="submit" disabled={loading || otp.length !== 6 || !isPassValid}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-primary hover:bg-sky-700 transition-colors disabled:bg-gray-300"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
