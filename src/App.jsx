import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
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
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminReviews from '@/pages/admin/AdminReviews';
import AdminPosters from '@/pages/admin/AdminPosters';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminRoles from '@/pages/admin/AdminRoles';
import AdminProfile from '@/pages/admin/AdminProfile';
import AdminLogin from '@/pages/admin/AdminLogin';
import PrintBarcodes from '@/pages/admin/PrintBarcodes';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminReports from '@/pages/admin/AdminReports';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Add page imports here

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
          </Route>
          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="posters" element={<AdminPosters />} />
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
        <SonnerToaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App