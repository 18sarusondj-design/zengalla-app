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
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeLang, setActiveLang] = useState('EN');

  const VIDEO_GUIDES = [
    {
      id: 'razorpay',
      title: 'Razorpay Integration',
      emoji: '💳',
      color: 'from-sky-400 to-sky-600',
      langs: { EN: 'dQw4w9WgXcQ', HI: 'dQw4w9WgXcQ', KN: 'dQw4w9WgXcQ' }
    },
    {
      id: 'store',
      title: 'Store Control Guide',
      emoji: '🏪',
      color: 'from-emerald-400 to-emerald-600',
      langs: { EN: 'dQw4w9WgXcQ', HI: 'dQw4w9WgXcQ', KN: 'dQw4w9WgXcQ' }
    }
  ];

  const currentVideo = VIDEO_GUIDES.find(v => v.id === activeVideo);
  const currentVideoId = currentVideo?.langs[activeLang];

  useEffect(() => {
    if (user && user.status === 'active') {
      navigate('/vendor/dashboard');
    }
  }, [user, navigate]);

  // Poll every 5 seconds to check if admin has granted access
  useEffect(() => {
    const interval = setInterval(async () => {
      if (refreshUser) {
        await refreshUser(true); // Silent refresh to prevent blinking
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  const handleManualRefresh = async () => {
    const toastId = toast.loading('Syncing with server...');
    await refreshUser(true); // Silent refresh here too
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
    <div className="md:h-screen w-full bg-sky-50 flex flex-col items-center p-2 md:p-4 font-sans relative md:overflow-hidden min-h-screen overflow-y-auto text-slate-900">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-sky-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-7xl flex flex-col gap-4 relative z-10 md:h-full md:max-h-[95vh]">
        
        {/* TOP: Training & Tutorials Bar */}
        <div className="bg-white border border-sky-100 rounded-[32px] overflow-hidden flex flex-col md:flex-row items-center justify-between p-4 shadow-xl shadow-sky-200/50 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 bg-sky-600 h-full" />
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                    <PlayCircle size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h2 className="text-xs font-black uppercase tracking-widest leading-none text-slate-900">Vendor Academy</h2>
                    <p className="text-[8px] font-black text-sky-500 uppercase tracking-widest mt-1">Master your digital storefront</p>
                 </div>
              </div>

              <div className="h-10 w-px bg-slate-100 hidden md:block" />

              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setActiveVideo('razorpay')}
                   className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 hover:bg-sky-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95"
                 >
                   <PlayCircle size={14} /> 1. Razorpay Setup
                 </button>
                 <button 
                   onClick={() => setActiveVideo('store')}
                   className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95"
                 >
                   <PlayCircle size={14} /> 2. Store Controls
                 </button>
              </div>
           </div>

           <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button 
                onClick={handleManualRefresh}
                className="h-10 px-5 bg-slate-900 text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
              >
                <RefreshCcw size={14} /> Sync Status
              </button>
              <button onClick={logout} className="h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 hover:bg-rose-500 hover:text-white transition-all">
                <LogOut size={18} />
              </button>
           </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
            <div className="w-8 h-8 bg-sky-600 text-white rounded-lg flex items-center justify-center shadow-2xl rotate-3">
                <Store size={18} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-lg font-black uppercase tracking-tighter leading-none text-slate-900">Grozy <span className="text-sky-600">Business</span></h2>
                <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Global Marketplace Portal</p>
            </div>
        </div>

        {/* MAIN CONTENT Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 md:min-h-0 md:overflow-hidden pb-10 md:pb-0">
          
          {/* Plans Selection - 2 Columns */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:min-h-0">
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
          <div className="w-full lg:w-[320px] flex flex-col gap-3 md:h-full">
            
            <div className={`p-4 rounded-[24px] border-2 transition-all cursor-pointer relative group ${addSponsorship ? 'bg-sky-600 border-sky-400 shadow-xl shadow-sky-200' : 'bg-white border-white hover:border-sky-100 shadow-xl shadow-sky-100'}`} onClick={() => setAddSponsorship(!addSponsorship)}>
               <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${addSponsorship ? 'bg-white text-sky-600' : 'bg-sky-600 text-white'}`}>
                    <Sparkles size={16} />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowSponsorDetails(true); }}
                    className={`px-2 py-1 rounded-full flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest transition-all ${addSponsorship ? 'bg-sky-500 text-white' : 'bg-white/10 text-sky-400 hover:bg-sky-600 hover:text-white'}`}
                  >
                    <Info size={10} /> Details
                  </button>
               </div>
               <h3 className={`text-md font-black uppercase tracking-tighter mb-0.5 ${addSponsorship ? 'text-white' : 'text-slate-900'}`}>Area Sponsorship</h3>
               <p className={`text-[8px] font-bold uppercase tracking-widest leading-tight mb-2 ${addSponsorship ? 'text-sky-100' : 'text-gray-500'}`}>
                 Top 4 slots in <span className={`${addSponsorship ? 'text-white' : 'text-sky-600'} font-black underline`}>{user?.pinCode || 'your area'}</span>.
               </p>
               <div className="flex items-center justify-between">
                  <span className={`text-lg font-black tracking-tighter italic ${addSponsorship ? 'text-white' : 'text-sky-600'}`}>₹199 <span className="text-[8px] opacity-60">/ Week</span></span>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${addSponsorship ? 'bg-white/20' : 'bg-gray-100'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${addSponsorship ? 'right-0.5 bg-white' : 'left-0.5 bg-gray-400'}`} />
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
            <div className="flex-1 bg-white rounded-[32px] p-5 flex flex-col justify-between text-slate-900 shadow-2xl overflow-hidden relative border border-slate-100">
               <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-sky-50 rounded-full blur-[40px] pointer-events-none opacity-50" />
               <div className="space-y-3 relative z-10">
                  <h3 className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400">Checkout Summary</h3>
                  <div className="space-y-1.5">
                    <SummaryRow label={`${selectedPlan === 'premium' ? 'Full Digital' : 'Basic'} Plan`} value={`₹${selectedPlan === 'premium' ? '999' : '499'}`} />
                    {addSponsorship && <SummaryRow label="Sponsorship (7 Days)" value="₹199" />}
                    <div className="h-px bg-slate-50 my-1" />
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest">Total Bill</span>
                       <span className="text-2xl font-black tracking-tighter text-sky-600 italic">₹{totalPrice}</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-2 relative z-10 pt-2">
                  <button 
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full h-10 bg-sky-600 hover:bg-slate-900 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-100"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : (
                      <><ShieldCheck size={16} /> Confirm & Activate</>
                    )}
                  </button>
                  <div className="p-2.5 bg-sky-50/50 rounded-xl border border-sky-100">
                    <p className="text-[7px] font-black text-sky-700 uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck size={10} /> Payment Note
                    </p>
                    <p className="text-[8px] font-bold text-sky-900/60 mt-0.5 leading-tight">
                       Setup <span className="font-black text-sky-600">Razorpay</span> in your profile after activation to receive payments.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Info - Compact */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 py-2 border-t border-sky-100">
           <div className="flex items-center gap-4">
              <InfoItem icon={<ShieldAlert size={12} />} text="End-to-End Encrypted" />
              <InfoItem icon={<CheckCircle2 size={12} />} text="24/7 Support" />
           </div>
           <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Grozy Commerce Suite v2.6.0</p>
        </div>

        {/* Video Modal - Matches Dashboard Style */}
        {activeVideo && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8"
            style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setActiveVideo(null)}
          >
            <div
              className="w-full max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-300"
              style={{ maxHeight: '92vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${currentVideo?.color} text-white`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currentVideo?.emoji}</span>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest leading-none">{currentVideo?.title}</p>
                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">Select language below</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="w-9 h-9 bg-white/20 hover:bg-white/40 rounded-xl flex items-center justify-center text-white transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Language Tabs */}
              <div className="flex gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
                {['EN', 'HI', 'KN'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                      activeLang === lang
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {lang === 'EN' ? '🇬🇧 English' : lang === 'HI' ? '🇮🇳 Hindi' : '🌿 Kannada'}
                  </button>
                ))}
                <p className="ml-auto text-[9px] text-gray-400 font-bold uppercase tracking-widest self-center italic">Click outside to close</p>
              </div>

              {/* YouTube Embed */}
              <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe
                  key={`${activeVideo}-${activeLang}`}
                  src={`https://www.youtube.com/embed/${currentVideoId}?rel=0&modestbranding=1&autoplay=1`}
                  title={currentVideo?.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PlanCard = ({ active, onClick, title, price, icon, features, isPremium }) => (
  <div 
    onClick={onClick}
    className={`relative rounded-[32px] p-5 flex flex-col border-2 transition-all cursor-pointer group h-full ${
      active 
      ? 'bg-white border-sky-600 shadow-2xl scale-[1.01]' 
      : 'bg-white/40 border-slate-100 hover:border-sky-200 shadow-sm'
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
      <h3 className={`text-lg font-black uppercase tracking-tighter mb-1 ${active ? 'text-slate-900' : 'text-slate-500'}`}>{title}</h3>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-black tracking-tighter italic ${active ? 'text-sky-600' : 'text-slate-400'}`}>₹{price}</span>
        <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${active ? 'text-gray-400' : 'text-slate-300'}`}>/ Month</span>
      </div>
    </div>

    <ul className="space-y-3 mb-6">
      {features.map((f, i) => (
        <li key={i} className={`flex items-start gap-3 text-[11px] font-black uppercase tracking-tight leading-none ${active ? 'text-slate-600' : 'text-slate-400'}`}>
          <CheckCircle2 size={14} className={active ? 'text-sky-500' : 'text-slate-200'} />
          {f}
        </li>
      ))}
    </ul>
    
    <div className={`mt-auto w-full h-10 rounded-xl flex items-center justify-center font-black uppercase tracking-widest text-[8px] transition-all ${
      active ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'bg-slate-100 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-500'
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
