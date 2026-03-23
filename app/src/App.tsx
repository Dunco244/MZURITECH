import { useEffect, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider } from '@/context/StoreContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import Header from '@/sections/Header';
import Hero from '@/sections/Hero';
import Categories from '@/sections/Categories';
import FeaturedProducts from '@/sections/FeaturedProducts';
import SpecialDeals from '@/sections/SpecialDeals';
import NewArrivals from '@/sections/NewArrivals';
import Testimonials from '@/sections/Testimonials';
import Brands from '@/sections/Brands';
import Newsletter from '@/sections/Newsletter';
import Footer from '@/sections/Footer';
import CartDrawer from '@/sections/CartDrawer';
import Shop from '@/pages/Shop';
import Laptops from '@/pages/Laptops';
import Phones from '@/pages/Phones';
import Accessories from '@/pages/Accessories';
import Deals from '@/pages/Deals';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import RegisterVendor from '@/pages/RegisterVendor';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Profile from '@/pages/Profile';
import OrderHistory from '@/pages/OrderHistory';
import AdminDashboard from '@/pages/AdminDashboard';
import Vendors from '@/pages/Vendors';
import Wishlist from '@/pages/Wishlist';
import Checkout from '@/pages/Checkout';
import GuestOrderTracking from '@/pages/GuestOrderTracking';
import ContactUs from '@/pages/Contactus';
import FAQs from '@/pages/Faqs';
import ShippingReturns from '@/pages/Shippingreturns';
import AboutUs from '@/pages/Aboutus';
import LegalPage from '@/pages/Legalpage';
import ProductDetail from '@/pages/Productdetails';
// Add this import at the top
import ComputersMonitors from '@/pages/Computersmonitors';
import DriverPortal from '@/pages/Driverportal';
import './App.css';

interface ErrorBoundaryProps  { children: ReactNode; }
interface ErrorBoundaryState  { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-primary-light/30">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We encountered an unexpected error. Please refresh the page or try again.</p>
            <button onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-primary-light/30">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function HomePage() {
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#') {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <SpecialDeals />
      <NewArrivals />
      <Testimonials />
      <Brands />
      <Newsletter />
    </>
  );
}

function PageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

function AppContent() {
  const { isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <ScrollToTop />
      <StoreProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"                      element={<PageLayout><HomePage /></PageLayout>} />
          <Route path="/shop"                  element={<PageLayout><Shop /></PageLayout>} />
          <Route path="/laptops"               element={<PageLayout><Laptops /></PageLayout>} />
          <Route path="/phones"                element={<PageLayout><Phones /></PageLayout>} />
          <Route path="/accessories"           element={<PageLayout><Accessories /></PageLayout>} />
          <Route path="/deals"                 element={<PageLayout><Deals /></PageLayout>} />
          <Route path="/login"                 element={<PageLayout><Login /></PageLayout>} />
          <Route path="/register"              element={<PageLayout><Register /></PageLayout>} />
          <Route path="/register-vendor"       element={<PageLayout><RegisterVendor /></PageLayout>} />
          <Route path="/wishlist"              element={<PageLayout><Wishlist /></PageLayout>} />
          <Route path="/forgot-password"       element={<PageLayout><ForgotPassword /></PageLayout>} />
          <Route path="/reset-password/:token" element={<PageLayout><ResetPassword /></PageLayout>} />
          <Route path="/computers-monitors" element={<PageLayout><ComputersMonitors /></PageLayout>} />
          <Route path="/product/:id" element={<PageLayout><ProductDetail /></PageLayout>} />

          {/* ── Checkout & tracking ── */}
          <Route path="/checkout"    element={<PageLayout><Checkout /></PageLayout>} />
          <Route path="/track-order" element={<PageLayout><GuestOrderTracking /></PageLayout>} />

          {/* ── Footer pages ── */}
          <Route path="/contact"          element={<PageLayout><ContactUs /></PageLayout>} />
          <Route path="/faqs"             element={<PageLayout><FAQs /></PageLayout>} />
          <Route path="/shipping-returns" element={<PageLayout><ShippingReturns /></PageLayout>} />
          <Route path="/about"            element={<PageLayout><AboutUs /></PageLayout>} />
          <Route path="/legal/:slug"      element={<PageLayout><LegalPage /></PageLayout>} />

          {/* ── Protected ── */}
          <Route path="/profile" element={<ProtectedRoute><PageLayout><Profile /></PageLayout></ProtectedRoute>} />
          <Route path="/orders"  element={<ProtectedRoute><PageLayout><OrderHistory /></PageLayout></ProtectedRoute>} />

          {/* ── No layout ── */}
          <Route path="/admin"   element={<AdminDashboard />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/driver/portal" element={<DriverPortal />} />
        </Routes>
        <CartDrawer />
      </StoreProvider>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

