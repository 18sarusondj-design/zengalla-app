import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';

import { StoreProvider } from './features/shop/context/StoreContext';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';

import CustomerLayout from './features/customer/components/CustomerLayout';
import AdminLayout from './features/shop/components/AdminLayout';
import PWAPrompt from './features/common/components/PWAPrompt';
import SystemUpdateBanner from './features/common/components/SystemUpdateBanner';
import NotificationRegistrar from './features/common/components/NotificationRegistrar';
import PageLoader from './features/common/components/PageLoader';

// Lazy Loaded Pages (Auth)
const Login = lazy(() => import('./features/auth/pages/Login'));
const Register = lazy(() => import('./features/auth/pages/Register'));
const ForgotPassword = lazy(() => import('./features/auth/pages/ForgotPassword'));
const VendorSignup = lazy(() => import('./features/auth/pages/VendorSignup'));
const VendorPending = lazy(() => import('./features/auth/pages/VendorPending'));

// Lazy Loaded Pages (Customer)
const Landing = lazy(() => import('./features/customer/pages/Landing'));
const ShopList = lazy(() => import('./features/customer/pages/ShopList'));
const ShopMenu = lazy(() => import('./features/customer/pages/ShopMenu'));
const Home = lazy(() => import('./features/customer/pages/Home'));
const Cart = lazy(() => import('./features/customer/pages/Cart'));
const Checkout = lazy(() => import('./features/customer/pages/Checkout'));
const OrderStatus = lazy(() => import('./features/customer/pages/OrderStatus'));
const CustomerOrders = lazy(() => import('./features/customer/pages/Orders'));
const Profile = lazy(() => import('./features/customer/pages/Profile'));
const ShopNotifications = lazy(() => import('./features/customer/pages/ShopNotifications'));
const Dues = lazy(() => import('./features/customer/pages/Dues'));

// Lazy Loaded Pages (Admin)
const Dashboard = lazy(() => import('./features/shop/pages/Dashboard'));
const Orders = lazy(() => import('./features/shop/pages/Orders'));
const Inventory = lazy(() => import('./features/shop/pages/Inventory'));
const Billing = lazy(() => import('./features/shop/pages/Billing'));
const InStoreOrders = lazy(() => import('./features/shop/pages/InStoreOrders'));
const VendorProfile = lazy(() => import('./features/shop/pages/VendorProfile'));
const Customers = lazy(() => import('./features/shop/pages/Customers'));
const StaffManagement = lazy(() => import('./features/shop/pages/StaffManagement'));
const DeliveryManagement = lazy(() => import('./features/shop/pages/DeliveryManagement'));
const B2BPartners = lazy(() => import('./features/shop/pages/B2BPartners'));
const OrderBillingManagement = lazy(() => import('./features/shop/pages/OrderBillingManagement'));
const CreditLedger = lazy(() => import('./features/shop/pages/CreditLedger'));
const B2BProcurement = lazy(() => import('./features/shop/pages/B2BProcurement'));
const DeliveryDashboard = lazy(() => import('./features/shop/pages/DeliveryDashboard'));
const Banners = lazy(() => import('./features/shop/pages/Banners'));
const BannerProducts = lazy(() => import('./features/customer/pages/BannerProducts'));

// Lazy Loaded Pages (Super Admin)
const Users = lazy(() => import('./features/admin/pages/Users'));
const SuperAdminDashboard = lazy(() => import('./features/admin/pages/SuperAdminDashboard'));
const SupportInbox = lazy(() => import('./features/admin/pages/SupportInbox'));
const AdminProfile = lazy(() => import('./features/admin/pages/AdminProfile'));

const ProtectedRoute = ({ children, requireRole, allowPending }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    sessionStorage.setItem('redirectUrl', location.pathname);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireRole) {
    const roles = (Array.isArray(requireRole) ? requireRole : [requireRole]).map(r => r.toLowerCase());
    const userRole = user.role?.toLowerCase();
    if (userRole && !roles.includes(userRole) && userRole !== 'admin') return <Navigate to="/" replace />;
    if (!userRole) return <Navigate to="/" replace />;
  }

  if (!allowPending && user.role === 'vendor' && user.status === 'pending') return <Navigate to="/vendor-pending" replace />;
  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
};

const AppToaster = () => {
  const { pathname } = useLocation();
  const position = pathname.includes('/billing') ? "top-center" : "top-right";
  return <Toaster richColors position={position} duration={2000} />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <StoreProvider>
          <ScrollToTop />
          <AppToaster />
          <PWAPrompt />
          <SystemUpdateBanner />
          <NotificationRegistrar />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/vendor-signup" element={<VendorSignup />} />
              <Route path="/vendor-pending" element={<ProtectedRoute requireRole="vendor" allowPending={true}><VendorPending /></ProtectedRoute>} />
              <Route path="/delivery/dashboard" element={<ProtectedRoute requireRole="delivery"><DeliveryDashboard /></ProtectedRoute>} />
              <Route path="/vendor-dashboard-redirect" element={<VendorDashboardRedirect />} />

              {/* Customer */}
              <Route path="/" element={<CustomerLayout />}>
                <Route index element={<ShopList />} />
                <Route path="shops" element={<ShopList />} />
                <Route path="shop/:shopId" element={<ShopMenu />} />
                <Route path="shop/:shopId/banner/:bannerId" element={<BannerProducts />} />
                <Route path="shop/:shopId/notifications" element={<ShopNotifications />} />
                <Route path="products" element={<Home />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<ProtectedRoute requireRole={['customer', 'vendor', 'staff']}><Checkout /></ProtectedRoute>} />
                <Route path="orders" element={<CustomerOrders />} />
                <Route path="order-status" element={<OrderStatus />} />
                <Route path="profile" element={<Profile />} />
                <Route path="dues" element={<Dues />} />
                <Route path="join" element={<Register />} />
              </Route>

              {/* Vendor Admin */}
              <Route path="/vendor/dashboard" element={<ProtectedRoute requireRole={['vendor', 'staff']}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="billing" element={<Billing />} />
                <Route path="in-store-orders" element={<InStoreOrders />} />
                <Route path="profile" element={<VendorProfile />} />
                <Route path="banners" element={<Banners />} />
                <Route path="customers" element={<Customers />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="b2b" element={<B2BPartners />} />
                <Route path="ledger" element={<OrderBillingManagement />} />
                <Route path="credit-customers" element={<CreditLedger />} />
                <Route path="procurement" element={<B2BProcurement />} />
              </Route>

              {/* Super Admin */}
              <Route path="/super-admin" element={<ProtectedRoute requireRole="admin"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="delivery" element={<DeliveryManagement />} />
                <Route path="vendors" element={<Users roleFilter="vendor" />} />
                <Route path="customers" element={<Users roleFilter="customer" />} />
                <Route path="support/vendors" element={<SupportInbox roleFilter="vendor" />} />
                <Route path="support/customers" element={<SupportInbox roleFilter="customer" />} />
                <Route path="profile" element={<AdminProfile />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </StoreProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

const VendorDashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'delivery') return <Navigate to="/delivery/dashboard" />;
  if (user.role === 'vendor' && user.status === 'pending') return <Navigate to="/vendor-pending" />;
  if (user.role === 'staff') return <Navigate to="/vendor/dashboard/billing" />;
  if (user.role === 'vendor' || user.role === 'admin') return <Navigate to="/vendor/dashboard" />;
  return <Navigate to="/" />;
}

export default App;
