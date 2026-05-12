import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, Smartphone, Truck, ArrowRight, Play, X, HelpCircle } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import ShopMapModal from '../components/ShopMapModal';
import Logo from '../../common/components/Logo';
import PWAInstallButton from '../../common/components/PWAInstallButton';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/superadmin/dashboard');
    }
  }, [user, navigate]);

  const USER_GUIDE_VIDEO = {
    title: 'How to Shop Online',
    emoji: '🛒',
    color: 'from-sky-500 to-rose-500',
    langs: {
      EN: 'dQw4w9WgXcQ',
      HI: 'dQw4w9WgXcQ',
      KN: 'dQw4w9WgXcQ',
    }
  };
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLang, setVideoLang] = useState('EN');

  return (
    <div className="min-h-screen font-sans overflow-x-hidden bg-white">

      {/* === HERO === */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 pt-20 pb-24 text-center">
          <div className="flex justify-center mb-6 animate-in zoom-in duration-1000">
            <Logo className="h-16" variant="icon" />
          </div>


          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-6">
            Zen<span className="text-sky-400">galla</span>
          </h1>
          <p className="text-sm text-white/50 font-bold uppercase tracking-[0.15em] leading-relaxed mb-10 max-w-xs mx-auto">
            Connect with your favorite local stores and shop with ease.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <button
              onClick={() => navigate('/shops')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 h-14 px-10 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl shadow-2xl shadow-sky-900/40 font-black uppercase tracking-widest text-[11px] active:scale-95 transition-all group"
            >
              Explore Nearby Shops <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <PWAInstallButton variant="hero" />
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-10">
            <span className="text-[9px] font-black text-sky-500 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full uppercase tracking-widest">Process</span>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mt-3">How It Works</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: '01', icon: <Logo variant="icon" className="w-6 h-6 bg-transparent p-0" />, title: 'Find Store', desc: 'Browse verified local vendors near you.' },
              { num: '02', icon: <ShoppingBag size={24} />, title: 'Fill Cart', desc: 'Add products with ease.' },
              { num: '03', icon: <Smartphone size={24} />, title: 'Scan & Pay', desc: 'Instant UPI payment.' },
              { num: '04', icon: <Truck size={24} />, title: 'Get Goods', desc: 'Pickup or delivery options.' },
            ].map(({ num, icon, title, desc }) => (
              <div key={num} className="bg-white border border-gray-100 rounded-[32px] p-6 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-sky-100 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-200 group-hover:scale-110 transition-transform">
                    {icon}
                  </div>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-100">
                    {num}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-sky-600 transition-colors">{title}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === VIDEO GUIDE === */}
      <section className="px-6 pb-16 bg-gray-50">
        <div className="max-w-[1400px] mx-auto">
          <button
            onClick={() => setVideoOpen(true)}
            className="w-full group relative rounded-3xl overflow-hidden border border-gray-200 hover:border-sky-200 transition-all hover:shadow-xl bg-white text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-rose-500 opacity-0 group-hover:opacity-5 transition-all duration-300" />
            <div className="relative flex items-center gap-4 px-5 py-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-rose-500 flex items-center justify-center shrink-0 shadow-lg">
                <Play size={22} className="text-white fill-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{USER_GUIDE_VIDEO.title}</p>
                <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">🇬🇧 EN · 🇮🇳 HI · 🌿 KN</p>
              </div>
              <div className="w-10 h-10 bg-sky-50 group-hover:bg-sky-100 border border-sky-100 rounded-xl flex items-center justify-center transition-all shrink-0">
                <ArrowRight size={14} className="text-sky-500" />
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Video Modal */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8"
          style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-500 to-rose-500">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{USER_GUIDE_VIDEO.emoji}</span>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-widest leading-none">{USER_GUIDE_VIDEO.title}</p>
                  <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">Select your language</p>
                </div>
              </div>
              <button onClick={() => setVideoOpen(false)} className="w-9 h-9 bg-white/20 hover:bg-white/40 rounded-xl flex items-center justify-center text-white transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
              {['EN', 'HI', 'KN'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setVideoLang(lang)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${videoLang === lang ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                >
                  {lang === 'EN' ? '🇬🇧 English' : lang === 'HI' ? '🇮🇳 Hindi' : '🌿 Kannada'}
                </button>
              ))}
            </div>
            <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
              <iframe
                key={videoLang}
                src={`https://www.youtube.com/embed/${USER_GUIDE_VIDEO.langs[videoLang]}?rel=0&modestbranding=1&autoplay=1`}
                title={USER_GUIDE_VIDEO.title}
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
  );
};

export default Landing;
