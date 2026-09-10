import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { loadStoreSettingOnce } from '@/lib/useStoreSetting';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';
import { LanguageProvider } from '@/lib/i18n';
import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import Home from '@/pages/store/Home';
import Catalog from '@/pages/store/Catalog';
import ProductDetail from '@/pages/store/ProductDetail';
import Checkout from '@/pages/store/Checkout';
import Wishlist from '@/pages/store/Wishlist';
import Orders from '@/pages/store/Orders';
import OrderDetail from '@/pages/store/OrderDetail';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminCustomers from '@/pages/admin/AdminCustomers';
import CustomerDetail from '@/pages/admin/CustomerDetail';
import AdminCoupons from '@/pages/admin/AdminCoupons';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminReviews from '@/pages/admin/AdminReviews';
import AdminTranslations from '@/pages/admin/AdminTranslations';
import AdminPosters from '@/pages/admin/AdminPosters';
import AdminHomeSections from '@/pages/admin/AdminHomeSections';
import AdminNavigation from '@/pages/admin/AdminNavigation';
import AdminApprovals from '@/pages/admin/AdminApprovals';
import AdminRejected from '@/pages/admin/AdminRejected';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminRoles from '@/pages/admin/AdminRoles';
import AdminProfile from '@/pages/admin/AdminProfile';
import AdminLogin from '@/pages/admin/AdminLogin';
import PrintBarcodes from '@/pages/admin/PrintBarcodes';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminReports from '@/pages/admin/AdminReports';
import PolicyPage from '@/pages/store/PolicyPage';
import Account from '@/pages/store/Account';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AdminAbandonedCarts from '@/pages/admin/AdminAbandonedCarts';
import AdminSupport from '@/pages/admin/AdminSupport';
import AdminFAQ from '@/pages/admin/AdminFAQ';
import RecoverCart from '@/pages/store/RecoverCart';
// Add page imports here

// Boot the singleton store Setting once so the currency formatter and
// storefront header/footer have live values on every route.
loadStoreSettingOnce();

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <LanguageProvider>
    <CartProvider>
      <WishlistProvider>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Admin login (separate, admin-only) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          {/* Standalone print page (no layout) */}
          <Route path="/print/barcodes" element={<PrintBarcodes />} />
          {/* Storefront */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/account" element={<Account />} />
            <Route path="/policies/:type" element={<PolicyPage />} />
            <Route path="/recover-cart" element={<RecoverCart />} />
          </Route>
          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="rejected" element={<AdminRejected />} />
            <Route path="translations" element={<AdminTranslations />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="posters" element={<AdminPosters />} />
            <Route path="home-sections" element={<AdminHomeSections />} />
            <Route path="navigation" element={<AdminNavigation />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="faq" element={<AdminFAQ />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </WishlistProvider>
    </CartProvider>
    </LanguageProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App