import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, ClipboardList, User, Home, Clock, ChevronLeft, Menu, X, Zap, Award, Gift, Star, ShieldCheck, HelpCircle, LogOut } from 'lucide-react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import Logo from '../../common/components/Logo';
import Footer from '../../common/components/Footer';
import CustomerReportModal from '../components/CustomerReportModal';
import PWAInstallButton from '../../common/components/PWAInstallButton';
import { toast } from 'sonner';

const CustomerLayout = () => {
  const { pathname } = useLocation();
  const { cart, currentShopId, totalCartItemCount, user: storeUser } = useStore();
  const { user: authUser, token, loading, logout } = useAuth();
  const user = authUser || storeUser;
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 🛡️ SECURITY: Prevent authenticated users from visiting /login or /register, but allow them to browse customer pages
  React.useEffect(() => {
    if (!loading && user) {
      const isAuthPage = pathname === '/login' || pathname === '/register';
      if (isAuthPage) {
        if (user.role === 'admin') {
          navigate('/super-admin', { replace: true });
        } else if (user.role === 'vendor' || user.role === 'staff' || user.role === 'delivery') {
          navigate('/vendor-dashboard-redirect', { replace: true });
        }
      }
    }
  }, [user, loading, navigate, pathname]);

  // --- Reload Persistence: Scroll Position ---
  React.useEffect(() => {
    // Only restore scroll on reload, not on internal navigation
    // Use session storage to distinguish reloads
    const scrollKey = `scroll_${pathname}`;
    const savedScroll = sessionStorage.getItem(scrollKey);

    if (savedScroll) {
      const timer = setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScroll, 10),
          behavior: 'instant'
        });
      }, 100);
      return () => clearTimeout(timer);
    }

    const handleScroll = () => {
      sessionStorage.setItem(scrollKey, window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  if (loading) return null;
  // If user is Admin/Vendor, don't even render the layout while redirecting
  // if (user && (user.role === 'admin' || user.role === 'vendor' || user.role === 'staff')) return null;

  const hideBottomNav = pathname.includes('/checkout');
  const hideTopNav = pathname === '/' || pathname === '/shops' || pathname === '/my-shops' || pathname.includes('/shop/') || pathname.includes('/checkout') || pathname.includes('/profile') || pathname.includes('/cart') || pathname.includes('/orders') || pathname === '/dues' || pathname === '/order-status';

  const isInShopMode = !!currentShopId;
  const isShopListPage = pathname === '/shops';

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans text-gray-900 overflow-x-hidden">
      {/* Full width container with responsive max-width for content centering */}
      <div className={`flex-1 w-full mx-auto bg-gray-50 shadow-sm relative ${hideBottomNav ? 'pb-4' : 'pb-16 md:pb-20'}`}>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-4/5 max-w-[320px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
              onClick={e => e.stopPropagation()}
            >
              {/* Sidebar Header */}
              <div className="p-6 bg-gradient-to-br from-gray-900 to-slate-800 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="relative flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-sky-500/20">
                    {user?.name?.charAt(0).toUpperCase() || <User size={24} />}
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="relative">
                  <h3 className="text-xl font-black tracking-tight">{user?.name || 'Guest User'}</h3>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">{user?.email || 'Login to sync data'}</p>
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">

                {/* Loyalty Card in Sidebar */}
                {user && (
                  <div className="bg-gradient-to-br from-sky-400 via-sky-500 to-rose-500 rounded-3xl p-4 text-white shadow-lg shadow-sky-200 mb-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="relative flex justify-between items-start">
                      <div>
                        <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Loyalty Points</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black tracking-tighter">{user.loyaltyPoints || 0}</span>
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">pts</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                        <Zap size={16} fill="white" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-[9px] font-black text-white/80 uppercase tracking-tight">VIP Member</p>
                    </div>
                  </div>
                )}

                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Menu</p>
                <SidebarItem to="/" icon={<Home size={20} />} label="Home" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/shops" icon={<Logo variant="icon" className="h-5 w-5 bg-transparent p-0" />} label="Discover Shops" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/orders" icon={<ClipboardList size={20} />} label="My Orders" onClick={() => setIsSidebarOpen(false)} />

                <div className="h-px bg-gray-100 my-2 mx-4" />
                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Account</p>
                <SidebarItem to="/profile" icon={<User size={20} />} label="Profile Settings" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/cart" icon={<ShoppingCart size={20} />} label="Shopping Cart" onClick={() => setIsSidebarOpen(false)} />

                {user?.role === 'vendor' && (
                  <SidebarItem to="/vendor/dashboard" icon={<ShieldCheck size={20} />} label="Vendor Dashboard" onClick={() => setIsSidebarOpen(false)} className="text-sky-600 bg-sky-50" />
                )}

                <PWAInstallButton variant="sidebar" className="mt-4" />
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-50">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-black text-sm uppercase tracking-tight"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/login"
                      onClick={() => setIsSidebarOpen(false)}
                      className="w-full flex items-center justify-center gap-4 px-4 py-4 rounded-2xl bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-sky-100"
                    >
                      <span>Login / Register</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Persistent Top Navbar */}
        {!hideTopNav && (
          <header className={`sticky top-0 z-50 shadow-lg border-b border-white/10 ${isShopListPage ? 'shrink-0' : ''}`} style={{ background: 'linear-gradient(160deg, #075985 0%, #0369a1 40%, #1e40af 100%)' }}>
            <div className="w-full max-w-[1600px] mx-auto px-4 py-3 md:py-4 md:pt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open menu"
                  className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white active:scale-90"
                >

                  <Menu size={24} strokeWidth={2.5} />
                </button>
                {isShopListPage && (
                  <button
                    onClick={() => navigate('/')}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white active:scale-90"
                  >
                    <ChevronLeft size={24} strokeWidth={3} />
                  </button>
                )}
                <Logo className="h-10" variant="full" white />
              </div>

              {/* Top Right Cart Icon - Visible everywhere except Home and Orders */}
              {(!['/', '/orders'].includes(pathname)) && (
                <Link to="/cart" className="relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors group animate-scale-in border border-white/10">
                  <ShoppingCart size={22} className="text-white" />
                  {totalCartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white animate-fade-in">
                      {Math.floor(totalCartItemCount)}
                    </span>
                  )}
                </Link>
              )}

              {/* Vendor Dashboard Link */}
              {user?.role === 'vendor' && (
                <Link
                  to="/vendor/dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-2xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 animate-fade-in"
                >
                  <ClipboardList size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Dashboard</span>
                </Link>
              )}
            </div>
          </header>
        )}

        <main className="flex-1">
          <div className="w-full mx-auto">
            <div className="flex-1">
              <Outlet />
              <div className="hidden md:block">
                <Footer onReportClick={() => setIsReportModalOpen(true)} navigate={navigate} />
              </div>
            </div>
          </div>
        </main>

        <CustomerReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          shopName="General Support"
        />

        {/* Dynamic Bottom Navigation - Floating Design */}
        {!hideBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex items-center h-16 sm:h-20 z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-500">
            <div className="w-full max-w-[1600px] mx-auto flex justify-around items-center h-full">
              {!token ? (
                // 🎁 Simplified Guest Navigation
                <>
                  <NavItem to="/" icon={<Home size={22} />} label="Home" />
                  <NavItem to="/shops" icon={<Store size={22} />} label="Shops" />
                  <NavItem to="/cart" icon={<ShoppingCart size={22} />} label="Cart" badge={totalCartItemCount > 0 ? Math.floor(totalCartItemCount) : null} />
                  <NavItem to="/profile" icon={<User size={22} />} label="Login" />
                </>
              ) : (
                // 👤 Full Navigation for Logged-in Users
                <>
                  <NavItem to="/" icon={<Home size={22} />} label="Home" />
                  <NavItem to="/my-shops" icon={<Clock size={22} />} label="Recent" />
                  <NavItem to="/shops" icon={<Store size={22} />} label="Shops" />
                  <NavItem to="/cart" icon={<ShoppingCart size={22} />} label="Cart" badge={totalCartItemCount > 0 ? Math.floor(totalCartItemCount) : null} />
                  <NavItem to="/orders" icon={<ClipboardList size={22} />} label="Orders" />
                  <NavItem to="/profile" icon={<User size={22} />} label="Profile" />
                </>
              )}
            </div>
          </nav>
        )}
        <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label, badge }) => {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-0.5 ${isActive ? 'text-sky-500 font-black' : 'text-gray-400 font-bold opacity-60'} transition-all relative`}
    >

      <div className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-sky-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white shadow-sm animate-in zoom-in duration-300">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] tracking-wide uppercase">{label}</span>
    </NavLink>
  );
};

const SidebarItem = ({ to, icon, label, onClick, className = "" }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-black text-xs uppercase tracking-tight ${isActive ? 'bg-brand-primary text-white shadow-lg shadow-sky-100' : `text-gray-600 hover:bg-gray-50 ${className}`}`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

export default CustomerLayout;
