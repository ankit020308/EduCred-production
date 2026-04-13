import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense, lazy, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BlockchainProvider } from './context/BlockchainContext';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import NotFound from './pages/NotFound';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Verifier = lazy(() => import('./pages/Verifier'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Student = lazy(() => import('./pages/Student'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));
const AuthError = lazy(() => import('./pages/AuthError'));

// Dashboards
const Admin = lazy(() => import('./pages/Admin')); // University Dashboard
const SystemAdmin = lazy(() => import('./pages/SystemAdmin')); // Global Admin Approval Panel
const Onboarding = lazy(() => import('./pages/Onboarding'));
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'));
const Profile = lazy(() => import('./pages/Profile'));

import PixelGridBackground from './components/PixelGridBackground';
import StudentDashboard from './components/StudentDashboard';

/**
 * Listens for globally intercepted unhandled promise rejections.
 */
function GlobalErrorListener() {
  const { toast } = useToast();
  const { logout } = useAuth();

  useEffect(() => {
    const handleApiError = (event) => {
      const msg = event.detail;
      if (msg === 'session_expired') {
        toast.error('Session expired. Please sign in again.');
        logout();
      } else if (msg === 'network_timeout') {
        toast.error('Network request timed out. Check your connection.');
      }
      // All other errors are handled by individual components
    };

    window.addEventListener('apiError', handleApiError);
    return () => window.removeEventListener('apiError', handleApiError);
  }, [toast, logout]);

  return null;
}

/**
 * Handles Google OAuth redirect callback — reads tokens from URL params,
 * persists them, then redirects to the correct dashboard.
 */
function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSessionFromOAuth, logout } = useAuth();

  useEffect(() => {
    const initSession = async () => {
      const access = searchParams.get('accessToken');
      const refresh = searchParams.get('refreshToken');
      const role = searchParams.get('role');
      const name = searchParams.get('name');

      if (!access) {
        console.error('[🚫 OAUTH_CLIENT_ERROR] No access token found in redirect URL.');
        // If we hit this without a token, something went wrong in the redirect.
        // Clear anything potentially stale and go back to login.
        logout(); 
        return navigate('/login', { replace: true });
      }

      try {
        await setSessionFromOAuth(access, refresh, { role: role || 'student', name: name || 'User' });
        
        const roleNorm = (role || 'student').toLowerCase();
        
        // Strict deterministic routing based on Sapphire protocol standards
        if (roleNorm === 'university') return navigate('/university-node', { replace: true });
        if (roleNorm === 'admin' || roleNorm === 'super_admin') return navigate('/sys-admin', { replace: true });
        if (roleNorm === 'pending') return navigate('/onboarding', { replace: true });
        
        // Default to student portal
        return navigate('/student-portal', { replace: true });
      } catch (err) {
        console.error('[🔥 OAUTH_HYDRATION_ERROR] Failed to establish session:', err);
        navigate('/auth/error?reason=session_hydration_failed', { replace: true });
      }
    };
    initSession();
  }, [searchParams, navigate, setSessionFromOAuth, logout]);

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-ping" />
          <div className="h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.4)]" />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-400 animate-pulse">Establishing SECURE Session</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Synchronizing Identity Protocol...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Role-Based Navigation Component
 * Redirects users to their specific dashboard based on their role.
 */
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const role = (user.role || 'student').toLowerCase();
  if (role === 'admin' || role === 'super_admin') return <Navigate to="/sys-admin" replace />;
  if (role === 'university') return <Navigate to="/university-node" replace />;
  if (role === 'pending') return <Navigate to="/onboarding" replace />;
  return <Navigate to="/student-portal" replace />;
}

/**
 * Navigation Wrapper
 * Conditionally hides the global Navbar on the landing page (/), auth pages, and dashboards.
 */
const NavigationWrapper = () => {
  const location = useLocation();
  const path = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const isLandingPage = path === '/';
  const isAuthPage = ['/login', '/signup', '/verify-otp', '/onboarding', '/auth/success', '/auth/error'].includes(path);
  const isDashboard = ['/university-node', '/sys-admin', '/student-portal', '/profile'].some(d => path.startsWith(d));

  return (
    <>
      <GlobalErrorListener />
      {!isLandingPage && !isAuthPage && !isDashboard && <Navbar />}

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh] relative z-50">
              <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/auth/success" element={<OAuthSuccess />} />
              <Route path="/auth/error" element={<AuthError />} />
              <Route path="/verify" element={<ErrorBoundary><Verifier /></ErrorBoundary>} />
              <Route path="/verify/:id" element={<ErrorBoundary><Verifier /></ErrorBoundary>} />
              <Route path="/ledger" element={<ErrorBoundary><Ledger /></ErrorBoundary>} />
              {/* Public student view - requires ID param from sharing */}
              <Route path="/student/:id" element={<ErrorBoundary><Student /></ErrorBoundary>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="/onboarding" element={
                <ProtectedRoute roles={['pending']}>
                  <Onboarding />
                </ProtectedRoute>
              } />

              {/* Role-Based Routes */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              <Route
                path="/sys-admin"
                element={
                  <ProtectedRoute roles={['admin', 'super_admin']}>
                    <ErrorBoundary><SystemAdmin /></ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/university-node"
                element={
                  <ProtectedRoute roles={['university']}>
                    <ErrorBoundary><Admin /></ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student-portal"
                element={
                  <ProtectedRoute roles={['student']}>
                    <ErrorBoundary><StudentDashboard /></ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute roles={['student', 'university', 'admin', 'super_admin']}>
                    <ErrorBoundary><Profile /></ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
    </>
  );
};

function App() {
  return (
    <ToastProvider>
      <BlockchainProvider>
        <AuthProvider>
          <Router>
            {/* 🌌 GLOBAL PIXEL BACKGROUND */}
            <PixelGridBackground />

            {/* 🌐 MAIN APP LAYER */}
            <div className="relative z-10 min-h-screen w-full flex flex-col text-white overflow-x-hidden">
              <NavigationWrapper />
            </div>
          </Router>
        </AuthProvider>
      </BlockchainProvider>
    </ToastProvider>
  );
}

export default App;