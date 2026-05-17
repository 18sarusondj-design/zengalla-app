import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, Receipt, Menu, X, Store as StoreIconCustom, AlertCircle, User, Loader2, Phone, Shield, Truck, Wallet, History as HistoryIcon, ShoppingBag } from 'lucide-react';
import { useStore } from '../../shop/context/StoreContext';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';
import api from '../../../config/api.js';
import Logo from '../../common/components/Logo';
import AdminLogo from '../../common/components/AdminLogo';
import PWAInstallButton from '../../common/components/PWAInstallButton';

const AdminLayout = () => {
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();
  const { handleGlobalScan, vendorShop, toggleShopStatus, isDeliveryMode, setIsDeliveryMode } = useStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isVendor = user?.role === 'vendor';
  const isStaff = user?.role === 'staff';
  const [vendorShopName, setVendorShopName] = useState(user?.shopName || 'SHOP ADMIN');
  const [adminStats, setAdminStats] = useState({ vendors: 0, customers: 0, vendorReports: 0, customerReports: 0 });

  // Determine Permissions
  const canManageInventory = isVendor || (isStaff && vendorShop?.staffPermissions?.canManageInventory !== false);
  const canViewCustomers = isVendor || (isStaff && vendorShop?.staffPermissions?.canViewCustomers !== false);

  React.useEffect(() => {
    if (vendorShop?.name) {
      setVendorShopName(vendorShop.name);
    }
  }, [vendorShop]);

  React.useEffect(() => {
    if ((isVendor || isStaff) && token) {
      // Also listen for shop update events
      const handleShopUpdate = (e) => {
        if (e.detail?.name) setVendorShopName(e.detail.name);
      };
      window.addEventListener('shop-updated', handleShopUpdate);
      return () => window.removeEventListener('shop-updated', handleShopUpdate);
    }
  }, [isVendor, isStaff, token]);

  React.useEffect(() => {
    if (isAdmin && token) {
      const fetchAdminStats = async () => {
        try {
          const { data } = await api.get('/admin/stats');
          if (data && data.stats) {
            setAdminStats({
              vendors: data.stats.pendingVendors,
              customers: data.stats.totalUsers,
              vendorReports: data.stats.vendorReports,
              customerReports: data.stats.customerReports
            });
          }
        } catch (err) {
          console.error("Failed to sync admin stats:", err);
        }
      };

      fetchAdminStats();

      // Listen for manual update triggers
      const handleManualUpdate = () => fetchAdminStats();
      window.addEventListener('admin-stats-update', handleManualUpdate);

      // Keep stats updated every 30 seconds
      const intervalId = setInterval(fetchAdminStats, 30000);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('admin-stats-update', handleManualUpdate);
      };
    }
  }, [isAdmin, token]);

  const [isReportModalOpen, useState2] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  React.useEffect(() => {
    const handleOpenReport = () => setIsReportModalOpen(true);
    window.addEventListener('open-report-modal', handleOpenReport);
    return () => window.removeEventListener('open-report-modal', handleOpenReport);
  }, []);

  const handleSendReport = async () => {
    if (!reportMessage.trim()) return toast.error('Please describe your issue');
    setIsReporting(true);
    try {
      const { data } = await api.post('/reports', {
        senderName: user.name,
        email: user.email,
        userRole: user.role,
        message: reportMessage
      });

      if (!data?.success) throw new Error('Failed to send report');

      toast.success(`Report sent to Administrator`);
      setIsReportModalOpen(false);
      setReportMessage('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsReporting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ðŸª Global HID Barcode Listener
  React.useEffect(() => {
    let barcodeData = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // 1. IGNORE if user is typing in a text field (input/textarea)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();

      // 2. TIMING: Hardware scanners are very fast (< 50ms)
      if (currentTime - lastKeyTime > 50) {
        barcodeData = '';
      }

      // 3. CAPTURE & EXECUTE: Listen for 'Enter' which signifies the end of a scan
      if (e.key === 'Enter') {
        if (barcodeData.length > 3) {
          handleGlobalScan(barcodeData);
          barcodeData = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        barcodeData += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGlobalScan]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col shadow-sm sticky top-0 h-screen md:overflow-hidden scrollbar-hide">
        <div className="min-h-[110px] flex flex-col justify-center px-5 border-b bg-brand-primaryLight/5 relative shrink-0">
          <div className="flex items-start justify-between w-full gap-2">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="shrink-0 mt-1 h-12 w-12 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-100 border border-sky-400">
                <Logo className="h-8" variant="icon" white />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[8px] font-black tracking-[0.2em] text-brand-primary/40 uppercase leading-none truncate">
                      {isAdmin ? 'Master Panel' : 'Shop Manager'}
                    </span>
                    {isAdmin && (
                      <span className="px-1.5 py-0.5 bg-sky-500 text-white text-[6px] font-black uppercase tracking-[0.1em] rounded-sm shadow-sm shadow-sky-100 shrink-0">
                        Super
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-brand-primary tracking-tighter leading-tight truncate pr-1" title={isAdmin ? 'ADMIN' : vendorShopName}>
                    {isAdmin ? 'ADMIN' : vendorShopName}
                  </h2>
                </div>
                {!isAdmin && (isVendor || isStaff) && (
                  <button
                    onClick={toggleShopStatus}
                    className={`mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all active:scale-95 w-fit ${vendorShop?.isActive ? 'bg-sky-50 text-sky-600 border-sky-100 shadow-sm shadow-sky-50' : 'bg-red-50 text-red-500 border-red-100 shadow-sm shadow-red-50'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${vendorShop?.isActive ? 'bg-sky-500' : 'bg-red-500'}`} />
                    <span className="text-[7px] font-black uppercase tracking-widest whitespace-nowrap">{vendorShop?.isActive ? 'ONLINE' : 'OFFLINE'}</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0 hover:rotate-12 active:scale-90 border border-transparent shadow-sm bg-white/80 hover:shadow-md"
            >
              <LogOut size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 md:overflow-hidden scrollbar-hide">
          {/* VENDOR & STAFF LINKS */}
          {(isVendor || isStaff) && (
            <>
              {vendorShop?.subscriptionPlan !== 'basic' && (
                <>
                  {isVendor && <NavItem to="/vendor/dashboard" exact icon={<LayoutDashboard size={20} />} label="Store Overview" />}
                  <NavItem to="/vendor/dashboard/orders" icon={<ShoppingCart size={20} />} label="Customer Orders" />
                </>
              )}
              {canManageInventory && <NavItem to="/vendor/dashboard/inventory" icon={<Package size={20} />} label="My Inventory" />}
              <NavItem to="/vendor/dashboard/billing" icon={<Receipt size={20} />} label="Billing Area" />
              <NavItem to="/vendor/dashboard/ledger" icon={<HistoryIcon size={20} />} label="Billing History" />
              {isVendor && (
                <>
                  <NavItem to="/vendor/dashboard/procurement" icon={<ShoppingBag size={20} />} label="B2B Procurement" />
                  <NavItem to="/vendor/dashboard/b2b" icon={<Users size={20} />} label="B2B Partners" />
                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <NavItem to="/vendor/dashboard/staff" icon={<Shield size={20} />} label="Staff Management" />
                  {/* Delivery Fleet access removed for vendors - centrally managed by Super Admin */}
                  {/* Order Ledger removed from here as it's now Billing History */}
                  {vendorShop?.isPayLater && <NavItem to="/vendor/dashboard/credit-customers" icon={<Wallet size={20} />} label="Credit Ledger" />}
                  <NavItem to="/vendor/dashboard/profile" icon={<User size={20} />} label="Shop Profile" />
                </>
              )}

              <div className="mt-auto pt-4 flex flex-col gap-2">

                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-report-modal'))}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-sky-600 bg-sky-50 hover:bg-sky-100 transition-all font-black text-[10px] uppercase tracking-widest border border-sky-100"
                >
                  <AlertCircle size={18} strokeWidth={3} />
                  <span>Report Problem</span>
                </button>
              </div>
            </>
          )}

          {/* SUPER ADMIN ONLY LINKS */}
          {isAdmin && (
            <>
              {/* Logistics Mode Toggle */}
              <div className="px-5 mb-6">
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isDeliveryMode ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-400 border border-indigo-100'}`}>
                      <Truck size={14} strokeWidth={3} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-900">Logistics Mode</span>
                  </div>
                  <button
                    onClick={() => setIsDeliveryMode(!isDeliveryMode)}
                    className={`relative w-9 h-5 rounded-full transition-all flex items-center px-1 ${isDeliveryMode ? 'bg-indigo-500 justify-end' : 'bg-indigo-200 justify-start'}`}
                  >
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </div>

              {!isDeliveryMode ? (
                <>
                  <NavItem to="/super-admin" exact icon={<LayoutDashboard size={20} />} label="Platform Growth" />
                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <p className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-4">Security Groups</p>
                  <NavItem to="/super-admin/vendors" icon={<Users size={20} />} label="Vendors List" badge={adminStats.vendors} />
                  <NavItem to="/super-admin/customers" icon={<Users size={20} />} label="Customers List" badge={adminStats.customers} />

                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <p className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-4">Inboxes</p>
                  <NavItem to="/super-admin/support/vendors" icon={<AlertCircle size={20} />} label="Vendor Support" badge={adminStats.vendorReports} />
                  <NavItem to="/super-admin/support/customers" icon={<AlertCircle size={20} />} label="Customer Support" badge={adminStats.customerReports} />

                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <p className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-4">My Account</p>
                  <NavItem to="/super-admin/profile" icon={<User size={20} />} label="My Security Settings" />
                </>
              ) : (
                <>
                  <p className="px-5 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 mt-4">Fleet Operations</p>
                  <NavItem to="/super-admin" exact icon={<LayoutDashboard size={20} />} label="Platform Growth" />
                  <NavItem to="/super-admin/orders" icon={<ShoppingCart size={20} />} label="Global Orders" />
                  <NavItem to="/super-admin/delivery" icon={<Truck size={20} />} label="Delivery Fleet" />
                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <p className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-4">Support Channels</p>
                  <NavItem to="/super-admin/support/vendors" icon={<AlertCircle size={20} />} label="Logistics Support" badge={adminStats.vendorReports} />
                  <NavItem to="/super-admin/support/customers" icon={<AlertCircle size={20} />} label="Tracking Support" badge={adminStats.customerReports} />
                </>
              )}
            </>
          )}
        </nav>

      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 overflow-x-hidden flex flex-col">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 md:hidden text-brand-primary font-black text-xl z-30 relative shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <AdminLogo className="h-8 w-8" /> {isAdmin ? 'ADMINISTRATION' : 'SHOP'}
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-gray-600">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="bg-white w-4/5 max-w-[300px] h-full shadow-2xl flex flex-col p-6 translate-x-0 transition-transform" onClick={e => e.stopPropagation()}>
              <div className="flex-1 flex flex-col gap-2">
                {(isVendor || isStaff) && (
                  <>
                    {vendorShop?.subscriptionPlan !== 'basic' && (
                      <>
                        {!isStaff && <NavItem to="/vendor/dashboard" exact icon={<LayoutDashboard size={20} />} label="Overview" onClick={() => setIsMobileMenuOpen(false)} />}
                        <NavItem to="/vendor/dashboard/orders" icon={<ShoppingCart size={20} />} label="Orders" onClick={() => setIsMobileMenuOpen(false)} />
                      </>
                    )}
                    {canManageInventory && <NavItem to="/vendor/dashboard/inventory" icon={<Package size={20} />} label="Inventory" onClick={() => setIsMobileMenuOpen(false)} />}
                    <NavItem to="/vendor/dashboard/billing" icon={<Receipt size={20} />} label="Billing Area" onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/vendor/dashboard/ledger" icon={<HistoryIcon size={20} />} label="Billing History" onClick={() => setIsMobileMenuOpen(false)} />
                    {isVendor && (
                      <>
                        <NavItem to="/vendor/dashboard/profile" icon={<User size={20} />} label="Profile" onClick={() => setIsMobileMenuOpen(false)} />
                        <NavItem to="/vendor/dashboard/staff" icon={<Shield size={20} />} label="Staff" onClick={() => setIsMobileMenuOpen(false)} />
                        {/* Delivery access removed for vendors */}
                        {vendorShop?.isWholesale && <NavItem to="/vendor/dashboard/b2b" icon={<Users size={20} />} label="Partners" onClick={() => setIsMobileMenuOpen(false)} />}
                        {/* Ledger removed as it's now History */}
                        {vendorShop?.isPayLater && <NavItem to="/vendor/dashboard/credit-customers" icon={<Wallet size={20} />} label="Credit" onClick={() => setIsMobileMenuOpen(false)} />}
                      </>
                    )}

                    <button
                      onClick={() => { setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('open-report-modal')); }}
                      className="flex items-center gap-3 px-5 py-4 rounded-2xl w-full text-sky-600 bg-sky-50 hover:bg-sky-100 transition-all font-black text-xs uppercase tracking-widest border border-sky-100"
                    >
                      <AlertCircle size={18} strokeWidth={3} />
                      <span>Report Problem</span>
                    </button>
                  </>
                )}
                {isAdmin && (
                  <>
                    <NavItem to="/super-admin" exact icon={<LayoutDashboard size={20} />} label="Platform Growth" onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/orders" icon={<ShoppingCart size={20} />} label="Global Orders" onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/delivery" icon={<Truck size={20} />} label="Delivery Fleet" onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/vendors" icon={<Users size={20} />} label="Vendors" badge={adminStats.vendors} onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/customers" icon={<Users size={20} />} label="Customers" badge={adminStats.customers} onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/support/vendors" icon={<AlertCircle size={20} />} label="Vendor Support" badge={adminStats.vendorReports} onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/support/customers" icon={<AlertCircle size={20} />} label="Customer Support" badge={adminStats.customerReports} onClick={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/super-admin/profile" icon={<User size={20} />} label="Security Settings" onClick={() => setIsMobileMenuOpen(false)} />
                  </>
                )}
              </div>
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-4 rounded-2xl w-full text-red-500 hover:bg-red-50 transition-all font-black text-xs uppercase tracking-widest border-t mt-4">
                <LogOut size={20} strokeWidth={3} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 relative">
          <div className="flex-1 p-4 md:p-8 md:overflow-hidden overflow-y-auto scrollbar-hide flex flex-col">
            <Outlet />
          </div>
        </div>

        {/* Global Report Modal */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
              <div className="p-10 pb-0 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Report a Problem</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Our team will assist you shortly</p>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <div className="p-10 space-y-6">
                <div className="space-y-4">
                  <div className="p-5 bg-sky-50 rounded-3xl border border-sky-100/50">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Priority Support</span>
                    </div>
                    <p className="text-xs font-bold text-sky-800/70 leading-relaxed">
                      Your report will be sent directly to <strong>sarusondj@gmail.com</strong>. We typically respond within 2-4 hours.
                    </p>
                  </div>

                  {(isVendor || isStaff) && (
                    <a
                      href="tel:6364589875"
                      className="flex items-center justify-center gap-4 w-full h-16 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 group"
                    >
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                        <Phone size={18} fill="currentColor" />
                      </div>
                      <span>Call Support: 6364589875</span>
                    </a>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Issue Description</label>
                    <textarea
                      rows="5"
                      placeholder="Describe your issue..."
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-sky-500/30 focus:bg-white rounded-2xl p-5 text-sm font-bold text-gray-800 focus:outline-none transition-all resize-none"
                      value={reportMessage}
                      onChange={(e) => setReportMessage(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 h-16 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReport}
                    disabled={isReporting}
                    className="flex-[2] h-16 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isReporting ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ to, exact, icon, label, onClick, badge }) => {
  const location = useLocation();
  const path = to.split('?')[0]; // Simple path matching
  const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <div className={`px-2.5 py-1 rounded-full text-[9px] leading-none ${isActive ? 'bg-white/20 text-white' : 'bg-sky-500 text-white shadow-md shadow-sky-500/20'} animate-in zoom-in`}>
          {badge}
        </div>
      )}
    </NavLink>
  );
};

export default AdminLayout;
