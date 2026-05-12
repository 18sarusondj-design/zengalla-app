import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { LogOut, Loader2, ShieldCheck, Sparkles, CheckCircle2, Zap, Globe, Store, ArrowRight, ShieldAlert, BadgeCheck, PlayCircle, Languages, Info, ExternalLink, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const VendorPending = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [addSponsorship, setAddSponsorship] = useState(false);
  const [showSponsorDetails, setShowSponsorDetails] = useState(false);

  useEffect(() => {
    if (user && user.status === 'active') {
      navigate('/vendor/dashboard');
    }
  }, [user, navigate]);

  // Poll every 5 seconds to check if admin has granted access
  useEffect(() => {
    const interval = setInterval(async () => {
      if (refreshUser) {
        await refreshUser();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  const handleManualRefresh = async () => {
    const toastId = toast.loading('Syncing with server...');
    await refreshUser();
    toast.success('Status updated', { id: toastId });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/monetization/select-plan', {
        plan: selectedPlan,
        sponsorshipRequested: addSponsorship
      });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = (selectedPlan === 'premium' ? 999 : 499) + (addSponsorship ? 199 : 0);

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center p-2 md:p-4 font-sans relative overflow-hidden text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-sky-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-7xl flex flex-col gap-4 relative z-10 h-full max-h-[95vh]">
        
        {/* TOP: Training & Tutorials Bar */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden flex flex-col md:flex-row gap-4">
           {/* Video Section */}
           <div className="flex-1 aspect-video md:aspect-auto md:h-32 bg-black relative group overflow-hidden">
              <iframe 
                className="absolute inset-0 w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                src="https://www.youtube.com/embed/placeholder" 
                title="Vendor Integration Tutorial"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
           </div>

           <div className="flex-[2] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <PlayCircle size={20} className="text-white" />
                 </div>
                 <div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest leading-none">Vendor Academy</h2>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1 italic">Setup Razorpay to get online amount</p>
                 </div>
              </div>
 
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleManualRefresh}
                  className="h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest border border-sky-400 shadow-lg shadow-sky-900/20"
                >
                  <RefreshCcw size={12} /> Sync Status
                </button>
                <button onClick={logout} className="h-8 px-3 bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 rounded-lg transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest border border-white/5">
                  <LogOut size={12} /> Disconnect
                </button>
              </div>
           </div>
        </div>

        {/* HEADER - Branding */}
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-sky-600 rounded-lg flex items-center justify-center shadow-2xl rotate-3">
                <Store size={18} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Zengalla <span className="text-sky-500">Business</span></h2>
                <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Global Marketplace Portal</p>
            </div>
        </div>

        {/* MAIN CONTENT Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
          
          {/* Plans Selection - 2 Columns */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
            <PlanCard 
              active={selectedPlan === 'basic'}
              onClick={() => setSelectedPlan('basic')}
              title="In-Store Basic"
              price="499"
              icon={<Zap size={24} />}
              features={['Unlimited In-Store Billing', 'Digital Ledger (Khata)', 'Staff Accounts', 'Basic Analytics', 'Restricted Online Presence']}
              color="gray"
            />
            <PlanCard 
              active={selectedPlan === 'premium'}
              onClick={() => setSelectedPlan('premium')}
              title="Full Digital Store"
              price="999"
              icon={<Globe size={24} />}
              features={['All Basic Features', 'Public Store on Website', 'Customer Mobile Ordering', 'Home Delivery System', 'Premium Storefront UI']}
              color="sky"
              isPremium
            />
          </div>

          {/* Right Sidebar - Summary & Sponsorship */}
          <div className="w-full lg:w-[320px] flex flex-col gap-3 h-full">
            
            {/* Sponsorship Power-up */}
            <div className={`p-5 rounded-[24px] border-2 transition-all cursor-pointer relative group ${addSponsorship ? 'bg-sky-600 border-sky-400 shadow-xl shadow-sky-900/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => setAddSponsorship(!addSponsorship)}>
               <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${addSponsorship ? 'bg-white text-sky-600' : 'bg-sky-600 text-white'}`}>
                    <Sparkles size={20} />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowSponsorDetails(true); }}
                    className={`px-2 py-1 rounded-full flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest transition-all ${addSponsorship ? 'bg-sky-500 text-white' : 'bg-white/10 text-sky-400 hover:bg-sky-500 hover:text-white'}`}
                  >
                    <Info size={10} /> Details
                  </button>
               </div>
               <h3 className="text-lg font-black uppercase tracking-tighter mb-1">Area Sponsorship</h3>
               <p className={`text-[9px] font-bold uppercase tracking-widest leading-relaxed mb-3 ${addSponsorship ? 'text-sky-100' : 'text-gray-400'}`}>
                 Boost your shop to the top 4 slots in <span className="text-white font-black underline">{user?.pinCode || 'your area'}</span>.
               </p>
               <div className="flex items-center justify-between">
                  <span className="text-xl font-black tracking-tighter italic">₹199 <span className="text-[9px] opacity-60">/ Week</span></span>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${addSponsorship ? 'bg-white' : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${addSponsorship ? 'right-0.5 bg-sky-600' : 'left-0.5 bg-white/40'}`} />
                  </div>
               </div>
            </div>

            {/* Explanation Modal Overlay (Inline) */}
            {showSponsorDetails && (
              <div className="absolute inset-x-4 top-[10%] bottom-[10%] lg:inset-auto lg:right-8 lg:top-[120px] lg:bottom-auto lg:w-[420px] bg-white text-slate-900 rounded-[40px] p-8 z-[100] shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-sky-500">
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-black uppercase tracking-tighter">Sponsorship System</h4>
                    <button onClick={() => setShowSponsorDetails(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all font-black">X</button>
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                          <BadgeCheck size={18} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 mb-1">Slot 1, 2 & 3: PAID EXCLUSIVITY</p>
                          <p className="text-xs font-bold text-gray-500 leading-relaxed">Only 3 shops per Pin Code can pay for these top spots. First come, first served.</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                          <RefreshCcw size={18} className="animate-spin-slow" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Slot 4: SYSTEM WILDCARD (FREE)</p>
                          <p className="text-xs font-bold text-gray-500 leading-relaxed">This spot rotates every week between ALL shops. We prioritize high ratings and great service. Everyone gets a chance!</p>
                       </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 leading-none">Weekly Update Schedule</p>
                       <p className="text-[10px] font-black text-slate-700">Every Sunday • 11:30 PM - 12:00 AM</p>
                    </div>
                 </div>
                 <button onClick={() => setShowSponsorDetails(false)} className="w-full mt-8 h-12 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition-all">Got It</button>
              </div>
            )}

            {/* Final Confirmation Card */}
            <div className="flex-1 bg-white rounded-[32px] p-6 flex flex-col justify-between text-slate-900 shadow-2xl overflow-hidden relative">
               <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-sky-50 rounded-full blur-[40px] pointer-events-none opacity-50" />
               <div className="space-y-4 relative z-10">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Checkout Summary</h3>
                  <div className="space-y-2">
                    <SummaryRow label={`${selectedPlan === 'premium' ? 'Full Digital' : 'Basic'} Plan`} value={`₹${selectedPlan === 'premium' ? '999' : '499'}`} />
                    {addSponsorship && <SummaryRow label="Sponsorship (7 Days)" value="₹199" />}
                    <div className="h-px bg-gray-100 my-2" />
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-black uppercase tracking-widest">Total Bill</span>
                       <span className="text-3xl font-black tracking-tighter text-sky-600 italic">₹{totalPrice}</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-2 relative z-10 pt-4">
                  <button 
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full h-12 bg-sky-600 hover:bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-sky-200"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : (
                      <><ShieldCheck size={18} /> Confirm & Activate</>
                    )}
                  </button>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 mb-2">
                    <p className="text-[8px] font-black text-sky-700 uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck size={10} /> Payment Method Note
                    </p>
                    <p className="text-[9px] font-bold text-sky-900/60 mt-1 leading-relaxed">
                       Setup <span className="font-black text-sky-600">Razorpay</span> in your shop profile after activation to receive online customer payments directly to your bank account.
                    </p>
                  </div>
                  <p className="text-[7px] font-bold text-gray-400 text-center uppercase tracking-widest leading-relaxed">
                    Activation occurs within 2 hours of payment verification.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Info - Compact */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 py-1 border-t border-white/5 opacity-40">
           <div className="flex items-center gap-4">
              <InfoItem icon={<ShieldAlert size={12} />} text="End-to-End Encrypted" />
              <InfoItem icon={<CheckCircle2 size={12} />} text="24/7 Support" />
           </div>
           <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest">Zengalla Commerce Suite v2.6.0</p>
        </div>
      </div>
    </div>
  );
};

const PlanCard = ({ active, onClick, title, price, icon, features, isPremium }) => (
  <div 
    onClick={onClick}
    className={`relative rounded-[32px] p-5 flex flex-col border-2 transition-all cursor-pointer group h-full ${
      active 
      ? 'bg-white border-white shadow-2xl scale-[1.01]' 
      : 'bg-white/5 border-white/10 hover:border-white/20'
    }`}
  >
    {isPremium && (
      <div className="absolute top-4 right-4">
        <div className={`px-2 py-1 rounded-full flex items-center gap-1.5 ${active ? 'bg-sky-500 text-white' : 'bg-sky-500/10 text-sky-500'}`}>
          <Sparkles size={10} />
          <span className="text-[8px] font-black uppercase tracking-widest">Growth Engine</span>
        </div>
      </div>
    )}

    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
      active ? 'bg-sky-600 text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/20'
    }`}>
      {icon}
    </div>

    <div className="mb-4">
      <h3 className={`text-lg font-black uppercase tracking-tighter mb-1 ${active ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-black tracking-tighter italic ${active ? 'text-sky-600' : 'text-white'}`}>₹{price}</span>
        <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${active ? 'text-gray-400' : 'text-white/30'}`}>/ Month</span>
      </div>
    </div>

    <ul className="space-y-3 mb-6">
      {features.map((f, i) => (
        <li key={i} className={`flex items-start gap-3 text-[11px] font-black uppercase tracking-tight leading-none ${active ? 'text-slate-600' : 'text-white/50'}`}>
          <CheckCircle2 size={14} className={active ? 'text-sky-500' : 'text-white/20'} />
          {f}
        </li>
      ))}
    </ul>
    
    <div className={`mt-auto w-full h-10 rounded-xl flex items-center justify-center font-black uppercase tracking-widest text-[8px] transition-all ${
      active ? 'bg-sky-600 text-white' : 'bg-white/5 text-white/40 group-hover:bg-white/10'
    }`}>
      {active ? 'Plan Selected' : 'Select Experience'}
    </div>
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-black text-slate-900 italic">{value}</span>
  </div>
);

const InfoItem = ({ icon, text }) => (
  <div className="flex items-center gap-2">
    <div className="text-sky-500">{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-widest">{text}</span>
  </div>
);

export default VendorPending;
