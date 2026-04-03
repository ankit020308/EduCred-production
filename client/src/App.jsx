import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BlockchainProvider } from './context/BlockchainContext';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Verifier from './pages/Verifier';
import Ledger from './pages/Ledger';
import Student from './pages/Student';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';

// New/Updated Dashboards
import Admin from './pages/Admin'; // This will be the University Dashboard
import SystemAdmin from './pages/SystemAdmin'; // Global Admin Approval Panel
import Onboarding from './pages/Onboarding';
import VerifyOTP from './pages/VerifyOTP';

import PixelGridBackground from './components/PixelGridBackground';

/**
 * Role-Based Navigation Component
 * Redirects users to their specific dashboard based on their role.
 */
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (user.role === 'admin') return <Navigate to="/sys-admin" />;
  if (user.role === 'university') return <Navigate to="/university-node" />;
  if (user.role === 'pending') return <Navigate to="/onboarding" />;

  return <Navigate to="/student-portal" />;
}

/**
 * Navigation Wrapper
 * Conditionally hides the global Navbar on the landing page (/)
 */
const NavigationWrapper = () => {
  const location = useLocation();
  const path = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const isLandingPage = path === '/';
  const isAuthPage = ['/login', '/signup', '/verify-otp', '/onboarding'].includes(path);

  return (
    <>
      {/* Conditionally render Global Navbar based on route */}
      {!isLandingPage && !isAuthPage && <Navbar />}

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/verify" element={<Verifier />} />
            <Route path="/verify/:id" element={<Verifier />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/student/:id" element={<Student />} />
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
                <ProtectedRoute roles={['admin']}>
                  <SystemAdmin />
                </ProtectedRoute>
              }
            />

            <Route
              path="/university-node"
              element={
                <ProtectedRoute roles={['university']}>
                  <Admin />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student-portal"
              element={
                <ProtectedRoute roles={['student']}>
                  <Student />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
};

function App() {
  return (
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
  );
}

export default App;