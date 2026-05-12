import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import { StoreProvider } from './features/shop/context/StoreContext';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';

import CustomerLayout from './features/customer/components/CustomerLayout';
import AdminLayout from './features/shop/components/AdminLayout';
import PWAPrompt from './features/common/components/PWAPrompt';
import NotificationRegistrar from './features/common/components/NotificationRegistrar';

// Pages (Auth)
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import VendorSignup from './features/auth/pages/VendorSignup';
import VendorLogin from './features/auth/pages/VendorLogin';
import VendorPending from './features/auth/pages/VendorPending';
import StaffLogin from './features/auth/pages/StaffLogin';
import DeliveryLogin from './features/auth/pages/DeliveryLogin';

// Pages (Customer)
import Landing from './features/customer/pages/Landing';
import ShopList from './features/customer/pages/ShopList';
import ShopMenu from './features/customer/pages/ShopMenu';
import Home from './features/customer/pages/Home';
import Cart from './features/customer/pages/Cart';
import Checkout from './features/customer/pages/Checkout';
import OrderStatus from './features/customer/pages/OrderStatus';
import CustomerOrders from './features/customer/pages/Orders';
import Profile from './features/customer/pages/Profile';
import MyShops from './features/customer/pages/MyShops';
import ShopNotifications from './features/customer/pages/ShopNotifications';
import Dues from './features/customer/pages/Dues';

// Pages (Admin)
import Dashboard from './features/shop/pages/Dashboard';
import Orders from './features/shop/pages/Orders';
import Inventory from './features/shop/pages/Inventory';
import Billing from './features/shop/pages/Billing';
import InStoreOrders from './features/shop/pages/InStoreOrders';
import VendorProfile from './features/shop/pages/VendorProfile';
import Customers from './features/shop/pages/Customers';
import StaffManagement from './features/shop/pages/StaffManagement';
import DeliveryManagement from './features/shop/pages/DeliveryManagement';
import B2BPartners from './features/shop/pages/B2BPartners';
import OrderBillingManagement from './features/shop/pages/OrderBillingManagement';
import CreditLedger from './features/shop/pages/CreditLedger';
import B2BProcurement from './features/shop/pages/B2BProcurement';
import DeliveryDashboard from './features/shop/pages/DeliveryDashboard';

// Pages (Super Admin)
import Users from './features/admin/pages/Users';
import SuperAdminDashboard from './features/admin/pages/SuperAdminDashboard';
import SupportInbox from './features/admin/pages/SupportInbox';
import AdminProfile from './features/admin/pages/AdminProfile';

const ProtectedRoute = ({ children, requireRole, allowPending }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

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
          <NotificationRegistrar />
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/vendor-signup" element={<VendorSignup />} />
            <Route path="/vendor-login" element={<VendorLogin />} />
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/delivery-login" element={<DeliveryLogin />} />
            <Route path="/delivery/dashboard" element={<ProtectedRoute requireRole="delivery"><DeliveryDashboard /></ProtectedRoute>} />
            <Route path="/vendor-pending" element={<ProtectedRoute requireRole="vendor" allowPending={true}><VendorPending /></ProtectedRoute>} />
            <Route path="/vendor-dashboard-redirect" element={<VendorDashboardRedirect />} />

            {/* Customer */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<Landing />} />
              <Route path="shops" element={<ShopList />} />
              <Route path="shop/:shopId" element={<ShopMenu />} />
              <Route path="shop/:shopId/notifications" element={<ShopNotifications />} />
              <Route path="products" element={<Home />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<ProtectedRoute requireRole={['customer', 'vendor', 'staff']}><Checkout /></ProtectedRoute>} />
              <Route path="orders" element={<CustomerOrders />} />
              <Route path="order-status" element={<OrderStatus />} />
              <Route path="profile" element={<Profile />} />
              <Route path="my-shops" element={<MyShops />} />
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
              <Route path="customers" element={<Customers />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="delivery" element={<DeliveryManagement />} />
              <Route path="b2b" element={<B2BPartners />} />
              <Route path="ledger" element={<OrderBillingManagement />} />
              <Route path="credit-customers" element={<CreditLedger />} />
              <Route path="procurement" element={<B2BProcurement />} />
            </Route>

            {/* Super Admin */}
            <Route path="/super-admin" element={<ProtectedRoute requireRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="vendors" element={<Users roleFilter="vendor" />} />
              <Route path="customers" element={<Users roleFilter="customer" />} />
              <Route path="support/vendors" element={<SupportInbox roleFilter="vendor" />} />
              <Route path="support/customers" element={<SupportInbox roleFilter="customer" />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StoreProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

const VendorDashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/vendor-login" />;
  if (user.role === 'delivery') return <Navigate to="/delivery/dashboard" />;
  if (user.role === 'vendor' && user.status === 'pending') return <Navigate to="/vendor-pending" />;
  if (user.role === 'staff') return <Navigate to="/vendor/dashboard/billing" />;
  if (user.role === 'vendor' || user.role === 'admin') return <Navigate to="/vendor/dashboard" />;
  return <Navigate to="/" />;
}

export default App;
