import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import { User, Phone, Lock, Loader2, ArrowRight, Camera, FileText, Image as ImageIcon } from 'lucide-react';
import Logo from '../../common/components/Logo';
import api from '../../../config/api.js';
import SelfieCamera from '../components/SelfieCamera';

const compressImage = (file, maxWidth = 1000, maxQuality = 0.7) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile.size > file.size ? file : compressedFile);
          },
          'image/jpeg',
          maxQuality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const DeliveryRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    documentUrl: null,
    selfieUrl: null,
  });
  
  const [step, setStep] = useState(1); // 1 = Details, 2 = Docs, 3 = OTP
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const { register, verifyOtp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if logged in as delivery (regardless of status, so dashboard can show pending screen)
  useEffect(() => {
    if (user && user.role === 'delivery') {
      navigate('/delivery/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleFileUpload = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const { data } = await api.post('/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data.url;
  };

  const handleImageChange = async (e, field) => {
    // If it's an event from file input, grab files[0]. If it's a File object (from selfie), use it directly
    const file = e?.target?.files ? e.target.files[0] : e;
    if (!file) return;
    try {
      setUploadingField(field);
      const compressedFile = await compressImage(file);
      const url = await handleFileUpload(compressedFile);
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success(`${field === 'documentUrl' ? 'Document' : 'Selfie'} uploaded successfully`);
      if (field === 'selfieUrl') setShowSelfieCamera(false);
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingField(null);
    }
  };

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || formData.phone.length < 10) {
      return toast.error('Please enter valid name and phone number');
    }
    setStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.documentUrl || !formData.selfieUrl) {
      return toast.error('Please upload all required documents');
    }
    
    setLocalLoading(true);
    const payload = { 
      ...formData, 
      photoUrl: formData.selfieUrl, // Use selfie as the profile photo
      role: 'delivery' 
    };
    const result = await register(payload);
    setLocalLoading(false);

    if (result.success) {
      toast.success('Registration initiated. OTP sent to phone.');
      setStep(3);
      setCooldown(30);
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return toast.error('Please enter the 6-digit OTP');
    
    setLocalLoading(true);
    const result = await verifyOtp(null, otp, formData.phone);
    setLocalLoading(false);
    
    if (result.success) {
      toast.success('Registration successful! Account pending admin approval.');
      // Navigation is now handled by the useEffect once the new user state commits.
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

      {/* Right Side: Register Form */}
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

        <div className="flex flex-col items-center flex-1 py-4 px-4 sm:px-6 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[480px] z-10 w-full py-4">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-xl shadow-emerald-100 border border-emerald-400 mb-3">
            <Logo className="h-8" variant="icon" white />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Join the Fleet</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Delivery Partner Registration</p>
        </div>

        <div className="bg-white py-6 px-6 sm:px-10 shadow-2xl rounded-[32px] border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
          
          {/* Progress Indicators */}
          <div className="flex justify-between px-8 mb-4">
             <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
             <div className={`flex-1 h-0.5 mt-1.5 ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
             <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
             <div className={`flex-1 h-0.5 mt-1.5 ${step >= 3 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
             <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          </div>

          {step === 1 && (
            <form className="space-y-6" onSubmit={handleNextStep1}>
              <FormInput 
                label="Full Name" 
                icon={<User size={20} />} 
                type="text" 
                placeholder="John Doe" 
                value={formData.name}
                onChange={(val) => setFormData(p => ({...p, name: val}))}
              />
              <FormInput 
                label="Phone Number" 
                icon={<Phone size={20} />} 
                type="tel" 
                placeholder="10-digit number" 
                value={formData.phone}
                onChange={(val) => setFormData(p => ({...p, phone: val}))}
              />

              <button
                type="submit"
                className="w-full h-14 bg-sky-500 text-white rounded-[24px] shadow-2xl hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 group"
              >
                Continue to Documents <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div className="space-y-4">
                <FileUpload
                  label="Government ID (Aadhar/PAN)"
                  icon={<FileText size={24} className="text-purple-500" />}
                  value={formData.documentUrl}
                  onChange={(e) => handleImageChange(e, 'documentUrl')}
                  loading={uploadingField === 'documentUrl'}
                />
                <FileUpload
                  label="Live Selfie (Profile Photo)"
                  icon={<Camera size={24} className="text-emerald-500" />}
                  value={formData.selfieUrl}
                  onClick={() => setShowSelfieCamera(true)}
                  loading={uploadingField === 'selfieUrl'}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-14 px-6 bg-gray-100 text-gray-500 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={localLoading || uploadingField !== null}
                  className="flex-1 h-14 bg-sky-500 text-white rounded-[24px] shadow-2xl hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group"
                >
                  {localLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>Submit & Verify <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">OTP sent to +91 {formData.phone}</p>
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
                disabled={localLoading}
                className="w-full h-14 bg-sky-500 text-white rounded-[24px] shadow-2xl hover:bg-sky-600 transition-all duration-500 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 group"
              >
                {localLoading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>Complete Registration <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-gray-50">
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Already a partner? <Link to="/delivery/login" className="text-sky-500 font-black hover:underline underline-offset-4 decoration-2">Login Here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  {showSelfieCamera && (
    <SelfieCamera 
      onCapture={(file) => handleImageChange(file, 'selfieUrl')}
      onClose={() => setShowSelfieCamera(false)}
    />
  )}
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

const FileUpload = ({ label, icon, value, onChange, onClick, capture, loading }) => (
  <div className="relative">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">
      {label}
    </label>
    <div className={`relative border-2 border-dashed ${value ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-gray-50/50'} rounded-[22px] p-4 flex items-center gap-4 transition-colors`}>
      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
        {loading ? (
          <Loader2 className="animate-spin text-emerald-500" size={24} />
        ) : value ? (
          <img src={value} alt="Uploaded" className="w-12 h-12 object-cover rounded-xl" />
        ) : icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-gray-700">
          {loading ? 'Uploading...' : value ? 'Document Uploaded' : 'Tap to select or capture'}
        </p>
        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Max 5MB • JPG/PNG</p>
      </div>
      {onClick ? (
        <button 
          type="button" 
          onClick={onClick} 
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      ) : (
        <input
          type="file"
          accept="image/*"
          capture={capture}
          onChange={onChange}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      )}
    </div>
  </div>
);

export default DeliveryRegister;
