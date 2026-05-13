import React from 'react';
import { HelpCircle } from 'lucide-react';
import Logo from '../../common/components/Logo';
import PWAInstallButton from './PWAInstallButton';


const Footer = ({ onReportClick, navigate }) => {
  return (
    <footer className="relative overflow-hidden shrink-0 pt-6 pb-24 md:pb-20 w-full" style={{ background: 'linear-gradient(160deg, #0ea5e9 0%, #0284c7 40%, #0369a1 100%)', boxShadow: '0 500px 0 500px #0369a1' }}>
      <div className="max-w-[1400px] mx-auto relative z-10 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mb-6">
          {/* Branding - Smaller on mobile */}
          <div className="col-span-2 hidden sm:flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 sm:mb-0">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <Logo className="h-6" variant="icon" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-white tracking-tighter uppercase leading-none">ZenGalla</h3>
              <button
                onClick={onReportClick}
                className="mt-2 flex items-center gap-2 px-3 h-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[8px] font-black text-white uppercase tracking-widest transition-all"
              >
                <HelpCircle size={12} className="text-sky-400" />
                Report Issue
              </button>
              
              {/* PWA Install Trigger */}
              <div className="mt-6 w-full max-w-[200px]">
                <PWAInstallButton variant="sidebar" className="!bg-white !text-sky-500 !h-12 !rounded-xl shadow-2xl" />
              </div>


            </div>
          </div>


          {/* Quick Links */}
          <div>
            <h4 className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Customer</h4>
            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-x-2 gap-y-2">
              {['Shops', 'Register', 'Orders', 'Cart', 'Profile'].map(link => (
                <li key={link}>
                  <button onClick={() => navigate(link === 'Shops' ? '/shops' : link === 'Register' ? '/register' : `/${link.toLowerCase()}`)} className="text-[9px] font-black text-white/70 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-sky-400 rounded-full" />
                    {link}
                  </button>
                </li>
              ))}
            </ul>

          </div>

          {/* Vendor Links */}
          <div>
            <h4 className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Partners</h4>
            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-x-2 gap-y-2">
              {['Join', 'Login', 'Delivery'].map(link => (
                <li key={link}>
                  <button onClick={() => navigate(link === 'Join' ? '/vendor-signup' : link === 'Login' ? '/vendor-login' : '/delivery-login')} className="text-[9px] font-black text-white/70 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-sky-400 rounded-full" />
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">ZenGalla v2.0</p>
          <div className="flex gap-3">
             <button onClick={onReportClick} className="sm:hidden text-[7px] font-black text-sky-400 uppercase tracking-widest">Report Issue</button>
             <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Privacy</span>
             <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
