import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Store, Mail, Lock, Phone, User, MapPin, 
  CheckCircle2, ArrowRight, Loader2, Camera,
  ShieldCheck, Smartphone, Eye, EyeOff, X, Search, Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import { useAuth } from '../../auth/context/AuthContext';
import Logo from '../../common/components/Logo';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 15.3647, lng: 75.1240 };

import LeafletMap from '../../common/components/LeafletMap';

const VendorSignup = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', pinCode: '',
    location: { address: '', coordinates: { lat: defaultCenter.lat, lng: defaultCenter.lng } }
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [showSatellite, setShowSatellite] = useState(true);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const { register, verifyOtp } = useAuth();

  const [isPassValid, setIsPassValid] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    setIsPassValid(/^(?=.*[0-9]).{7,}$/.test(formData.password));
    setIsPhoneValid(/^\d{10}$/.test(formData.phone));
  }, [formData.password, formData.phone]);

  const onLocationChange = (coords) => {
    const { lat, lng } = coords;
    
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: { lat, lng }
      }
    }));

    // Use FREE OpenStreetMap Nominatim API instead of paid Google Geocoder
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`)
      .then(res => res.json())
      .then(data => {
        console.log("OSM Data:", data);
        const postalCode = data.address?.postcode;

        if (postalCode) {
          // Clean pin code (OSM sometimes adds extra stuff)
          const cleanPin = postalCode.split(' ')[0].replace(/\D/g, '').substring(0, 6);
          if (cleanPin.length >= 5) {
             setFormData(prev => ({ ...prev, pinCode: cleanPin }));
             toast.success(`Pin Code ${cleanPin} Detected!`, { id: 'geo-success' });
             if (!formData.location.address) {
                const poiName = data.address?.shop || data.address?.amenity || data.address?.building || data.address?.office || data.address?.tourism;
                const fullAddress = poiName && !data.display_name.startsWith(poiName) 
                  ? `${poiName}, ${data.display_name}` 
                  : data.display_name;
                  
                setFormData(prev => ({ 
                  ...prev, 
                  location: { ...prev.location, address: fullAddress } 
                }));
             }
          }
        } else {
          // If no explicit postcode, try to extract from display_name
          const match = data.display_name.match(/\b\d{6}\b/);
          if (match) {
            setFormData(prev => ({ ...prev, pinCode: match[0] }));
          }
          toast.info("Location pinned.", { id: 'geo-info' });
        }
      })
      .catch(err => {
        console.error("OSM Error:", err);
        toast.info("Location pinned. Please enter the Pin Code manually.", { id: 'geo-info' });
      });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!isPassValid || !isPhoneValid) return;
    if (!formData.pinCode) return toast.error('Please select a precise location on the map to get your Pin Code');

    setLoading(true);
    const toastId = toast.loading('Initiating registration...');
    try {
      const regResult = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: 'vendor',
        shop_address: formData.location.address,
        shop_lat: formData.location.coordinates.lat,
        shop_lng: formData.location.coordinates.lng,
        pinCode: formData.pinCode
      });

      if (!regResult.success) throw new Error(regResult.error);

      toast.success('Verification code sent to your email!', { id: toastId });
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return toast.error('Please enter valid 6-digit code');
    
    setLoading(true);
    const toastId = toast.loading('Verifying code...');
    try {
      const result = await verifyOtp(formData.email, otp);
      if (result.success) {
        toast.success('Email verified! Your shop is now pending admin approval.', { id: toastId });
        navigate('/login');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="h-screen bg-white flex font-sans relative overflow-hidden">
      {/* Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
          <div className="bg-white w-full h-full md:rounded-[48px] overflow-hidden flex flex-col shadow-2xl relative">
             <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4 pointer-events-auto w-full md:w-auto">
                  <div className="w-10 h-10 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <MapPin size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tighter uppercase leading-none">Pin Shop Location</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Satellite Precision Mode</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-[24px] shadow-xl border border-gray-100 pointer-events-auto w-full max-w-md flex items-center gap-2 group focus-within:ring-4 focus-within:ring-sky-500/10 transition-all">
                  <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-focus-within:text-sky-500 transition-colors">
                      <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search area, landmark or shop street..." 
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder:text-gray-300"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const query = e.target.value;
                        if (!query) return;
                        const toastId = toast.loading('Searching location...');
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en`);
                          const results = await res.json();
                          if (results && results.length > 0) {
                            const { lat, lon } = results[0];
                            onLocationChange({ lat: parseFloat(lat), lng: parseFloat(lon) });
                            toast.success('Location found!', { id: toastId });
                          } else {
                            toast.error('Location not found', { id: toastId });
                          }
                        } catch (err) {
                          toast.error('Search failed', { id: toastId });
                        }
                      }
                    }}
                  />
                </div>

                <div className="flex gap-4 pointer-events-auto">
                  <button 
                    onClick={() => setShowSatellite(prev => !prev)}
                    className="px-6 h-12 bg-white text-gray-900 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl border border-gray-100 hover:bg-sky-50 transition-all"
                  >
                    {showSatellite ? 'Map View' : 'Satellite View'}
                  </button>
                  <button 
                    onClick={() => setIsMapModalOpen(false)}
                    className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-sky-600 transition-all active:scale-90"
                  >
                    <X size={20} />
                  </button>
                </div>
             </div>

             <div className="flex-1 relative">
                 <LeafletMap 
                   height="100%"
                   userCoords={formData.location.coordinates}
                   onUserLocationChange={onLocationChange}
                   onLocationSelect={onLocationChange}
                   showSatellite={showSatellite}
                   zoom={18}
                 />
                 
                 {/* Small Detect Location Button */}
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     if (!navigator.geolocation) return toast.error("Geolocation not supported");
                     const tid = toast.loading("Detecting...");
                     navigator.geolocation.getCurrentPosition(
                       (pos) => {
                         onLocationChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                         toast.success("Located!", { id: tid });
                       },
                       (err) => {
                         toast.error("Enable GPS access", { id: tid });
                       },
                       { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                     );
                   }}
                   className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-sky-600 hover:scale-110 active:scale-95 transition-all border border-gray-100"
                   title="Locate Me"
                 >
                   <Navigation size={20} fill="currentColor" />
                 </button>
             </div>
               
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-6">
                  {formData.pinCode && (
                    <div className="mb-4 bg-sky-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-300">
                      <span className="text-[10px] font-black uppercase tracking-widest">Pin Code Detected:</span>
                      <span className="text-sm font-black">{formData.pinCode}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setIsMapModalOpen(false)}
                    className="w-full h-14 bg-gray-900 text-white rounded-2xl shadow-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-sky-600 transition-all"
                  >
                    <CheckCircle2 size={16} /> Confirm Location
                  </button>
               </div>
          </div>
        </div>
      )}

      {/* Left Side: Branding */}
      <div className="hidden lg:flex lg:w-1/3 relative overflow-hidden">
        <img 
          src="/brand_login.png" 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Vendor Signup Branding"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent flex flex-col justify-end p-12">
          <div className="animate-fade-in-up">
            <div className="flex justify-center mb-8">
              <Logo className="h-12 px-6 shadow-2xl shadow-sky-500/20" variant="full" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-3 leading-none">Global Vendor<br/>Registration.</h2>
            <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em] leading-relaxed mb-8 max-w-xs">
              Join the future of retail. Set up your digital storefront in minutes with Zengalla.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative bg-slate-50 overflow-y-auto custom-scrollbar-visible">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden lg:hidden">
          <img 
            src="/brand_login.png" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
            alt="Vendor Signup Branding Mobile"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white/90" />
        </div>

        <div className="w-full max-w-5xl flex flex-col justify-center">
          <div className="bg-white py-8 px-8 sm:px-12 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)] rounded-[48px] border border-gray-100 flex flex-col gap-6 animate-fade-in-up relative">
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-sky-500 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-100 border border-sky-400">
                  <Logo className="h-10" variant="icon" white />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">New Shop Details</h2>
                  <p className="mt-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none text-emerald-500">Business Verification Hub</p>
                </div>
              </div>
            </div>

            {step === 1 ? (
              <form className="space-y-3" onSubmit={handleSignup}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 1 */}
                <div className="space-y-5">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gray-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">01</div>
                      <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Store Identity</h3>
                   </div>
                   
                   <FormInput 
                     label="Store Name" 
                     icon={<Store size={18} />} 
                     type="text" 
                     placeholder="" 
                     value={formData.name}
                     onChange={(val) => setFormData({...formData, name: val})}
                   />
                   
                   <FormInput 
                     label="Business Email" 
                     icon={<Mail size={18} />} 
                     type="email" 
                     placeholder="" 
                     value={formData.email}
                     onChange={(val) => setFormData({...formData, email: val})}
                   />

                   <div className="grid grid-cols-2 gap-4">
                     <div className="relative">
                       <FormInput 
                         label="Access Password" 
                         icon={<Lock size={18} />} 
                         type={showPassword ? 'text' : 'password'} 
                         placeholder="••••••••" 
                         value={formData.password}
                         onChange={(val) => setFormData({...formData, password: val})}
                         rightElement={
                           <button
                             type="button"
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-sky-600"
                           >
                             {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                           </button>
                         }
                       />
                       {!isPassValid && formData.password && (
                         <p className="absolute -bottom-4 left-4 text-[7px] text-rose-500 font-bold uppercase tracking-widest">Min. 7 Chars + 1 Number</p>
                       )}
                     </div>

                      <div className="relative">
                        <FormInput 
                          label="Business Phone" 
                          icon={<Phone size={18} />} 
                          type="tel" 
                          placeholder="" 
                          value={formData.phone}
                          onChange={(val) => setFormData({...formData, phone: val})}
                        />
                       {!isPhoneValid && formData.phone && (
                         <p className="absolute -bottom-4 left-4 text-[7px] text-rose-500 font-bold uppercase tracking-widest">Invalid Format</p>
                       )}
                     </div>
                   </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-sky-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black">02</div>
                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Store Location</h3>
                  </div>

                  <div className="relative group">
                     <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 group-focus-within:text-sky-600">Physical Store Address</label>
                      <textarea
                        required
                        className="block w-full px-5 py-3 border-2 border-gray-50 rounded-[24px] bg-gray-50/50 text-xs font-bold text-gray-800 focus:outline-none focus:border-sky-500/30 focus:bg-white transition-all placeholder:text-gray-300 shadow-inner h-20 resize-none"
                        placeholder=""
                        value={formData.location.address}
                        onChange={(e) => setFormData({...formData, location: { ...formData.location, address: e.target.value }})}
                      />
                  </div>

                  <FormInput 
                    label="Pin Code (Postal Code)" 
                    icon={<MapPin size={18} />} 
                    type="text" 
                    placeholder="Enter 6-digit pin" 
                    maxLength={6}
                    value={formData.pinCode}
                    onChange={(val) => setFormData({...formData, pinCode: val.replace(/\D/g, '')})}
                  />

                  <div className="relative">
                    <div 
                      className="h-28 rounded-[24px] bg-slate-100 overflow-hidden border-2 border-gray-50 shadow-inner group cursor-pointer relative"
                      onClick={() => setIsMapModalOpen(true)}
                    >
                      <LeafletMap 
                        height="100%"
                        userCoords={formData.location.coordinates}
                        zoom={13}
                        autoDetect={false}
                        interactive={false}
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all flex items-center justify-center z-[1000]">
                         <div className="bg-white/90 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 transform translate-y-0 transition-all border border-sky-100">
                           <MapPin size={12} className="text-sky-600" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Fullscreen Map</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPassValid || !isPhoneValid}
                className="w-full h-14 bg-gray-900 text-white rounded-2xl shadow-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>Finalize Shop Registration <ArrowRight size={16} strokeWidth={3} /></>
                )}
              </button>
              </form>
            ) : (
              <form className="space-y-6 max-w-md mx-auto w-full py-8" onSubmit={handleVerifyOtp}>
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-sky-100">
                    <ShieldCheck size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Verify Business Email</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Enter the 6-digit code sent to <span className="text-sky-600 underline decoration-2">{formData.email}</span>
                  </p>
                </div>

                <FormInput 
                  label="Verification Code" 
                  icon={<Smartphone size={18} />} 
                  type="text" 
                  placeholder="000000" 
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  maxLength={6}
                />

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-14 bg-sky-600 text-white rounded-2xl shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>Verify & Submit Shop <CheckCircle2 size={16} strokeWidth={3} /></>
                  )}
                </button>

                <p className="text-center text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  Didn't receive the code? {resendTimer > 0 ? (
                    <span className="text-sky-600 font-black">Resend in {resendTimer}s</span>
                  ) : (
                    <button type="button" onClick={handleSignup} className="text-sky-600 hover:underline">Resend Code</button>
                  )}
                </p>
              </form>
            )}


            <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
              Existing Store? <Link to="/login" className="text-sky-600 underline underline-offset-4 font-black">Login Business Account</Link>
            </p>
          </div>
          <p className="mt-4 text-center text-[7px] text-gray-300 font-medium uppercase tracking-[0.2em]">Zengalla Digital Infrastructure v2.4.0</p>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, icon, type, placeholder, value, onChange, rightElement, maxLength }) => (
  <div className="group/input">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 transition-colors group-focus-within/input:text-sky-600">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within/input:text-sky-500 transition-colors">
        {React.cloneElement(icon, { strokeWidth: 2.5 })}
      </div>
      <input
        type={type} required
        maxLength={maxLength}
        className={`block w-full pl-12 ${rightElement ? 'pr-12' : 'pr-4'} py-3 border-2 border-gray-50 rounded-2xl bg-gray-50/50 text-xs font-bold text-gray-800 focus:outline-none focus:border-sky-500/30 focus:bg-white transition-all placeholder:text-gray-300 shadow-inner`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {rightElement}
    </div>
  </div>
);

export default VendorSignup;
