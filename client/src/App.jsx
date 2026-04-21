import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BlockchainProvider } from './context/BlockchainContext';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import NotFound from './pages/NotFound';
import ProtocolBootSequence from './components/ProtocolBootSequence';

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

import StudentDashboard from './components/StudentDashboard';

/**
 * Listens for globally intercepted unhandled promise rejections.
 */
function GlobalErrorListener() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleApiError = (event) => {
      const msg = event.detail;
      const path = location.pathname.toLowerCase();
      const isPublicPage = ['/', '/login', '/signup', '/verify-otp', '/verify'].some(p => path === p || path.startsWith('/verify/'));

      if (msg === 'session_expired') {
        // 🚀 PROACTIVE SUPPRESSION: Only show session toasts on protected routes
        if (!isPublicPage) {
          toast.error('Session expired. Please sign in again.');
        }
        logout();
      } else if (msg === 'network_timeout') {
        toast.error('Network request timed out. Check your connection.');
      }
    };

    window.addEventListener('apiError', handleApiError);
    return () => window.removeEventListener('apiError', handleApiError);
  }, [toast, logout, location.pathname]);

  return null;
}

/**
 * Handles Google OAuth redirect callback
 */
function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSessionFromOAuth } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    const initSession = async () => {
      hasInitialized.current = true;
      const access = searchParams.get('accessToken');
      const refresh = searchParams.get('refreshToken');
      const role = searchParams.get('role');
      const name = searchParams.get('name');

      try {
        await setSessionFromOAuth(access, refresh, { role: role || 'student', name: name || 'User' });
        const roleNorm = (role || 'student').toLowerCase();
        
        if (roleNorm === 'university') return navigate('/university-node', { replace: true });
        if (roleNorm === 'admin' || roleNorm === 'super_admin') return navigate('/sys-admin', { replace: true });
        if (roleNorm === 'pending') return navigate('/onboarding', { replace: true });
        return navigate('/student-portal', { replace: true });
      } catch (err) {
        console.error('[🔥 OAUTH_HYDRATION_ERROR]', err);
        navigate('/auth/error?reason=session_hydration_failed', { replace: true });
      }
    };
    initSession();
  }, [searchParams, navigate, setSessionFromOAuth]);

  return (
    <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Securing Session...</p>
      </div>
    </div>
  );
}

/**
 * Role-Based Navigation Component
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
 */
const NavigationWrapper = () => {
  const location = useLocation();
  const path = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const isLandingPage = path === '/';
  const isAuthPage = ['/login', '/signup', '/verify-otp', '/onboarding', '/auth/success', '/auth/error'].includes(path);
  const isDashboard = ['/university-node', '/sys-admin', '/student-portal', '/profile'].some(d => path.startsWith(d));
  const isSelfHeadered = path.startsWith('/verify') || path.startsWith('/student/');

  return (
    <>
      <GlobalErrorListener />
      {!isLandingPage && !isAuthPage && !isDashboard && !isSelfHeadered && <Navbar />}

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
              <Route path="/student/:id" element={<ErrorBoundary><Student /></ErrorBoundary>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/onboarding" element={<ProtectedRoute roles={['pending']}><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/sys-admin" element={<ProtectedRoute roles={['admin', 'super_admin']}><ErrorBoundary><SystemAdmin /></ErrorBoundary></ProtectedRoute>} />

              <Route path="/university-node" element={<ProtectedRoute roles={['university']}><ErrorBoundary><Admin /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/student-portal" element={<ProtectedRoute roles={['student']}><ErrorBoundary><StudentDashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute roles={['student', 'university', 'admin', 'super_admin']}><ErrorBoundary><Profile /></ErrorBoundary></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
    </>
  );
};

function App() {
  const [hasBooted, setHasBooted] = useState(() => sessionStorage.getItem('educred_booted') === 'true');

  const handleBootComplete = () => {
    setHasBooted(true);
    sessionStorage.setItem('educred_booted', 'true');
  };

  return (
    <ToastProvider>
      <BlockchainProvider>
        <AuthProvider>
          <Router>
            {!hasBooted && <ProtocolBootSequence onComplete={handleBootComplete} />}
            {hasBooted && (
                <div className="relative z-10 min-h-screen w-full flex flex-col text-white overflow-x-hidden font-sans">
                  <NavigationWrapper />
                </div>
            )}
          </Router>
        </AuthProvider>
      </BlockchainProvider>
    </ToastProvider>
  );
}

export default App;