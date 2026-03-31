import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { BlockchainProvider } from './context/BlockchainContext';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Verifier from './pages/Verifier';
import Ledger from './pages/Ledger';
import Student from './pages/Student';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';

import PixelGridBackground from './components/PixelGridBackground';

function App() {
  return (
    <BlockchainProvider>
      <AuthProvider>
        <Router>
  
          {/* 🌌 GLOBAL PIXEL BACKGROUND */}
          <PixelGridBackground />
  
          {/* 🌐 MAIN APP LAYER */}
          <div className="relative z-10 min-h-screen w-full flex flex-col text-white overflow-x-hidden">
  
            {/* NAVBAR */}
            <Navbar />
  
            {/* CONTENT */}
            <main className="flex-1 w-full">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/verify" element={<Verifier />} />
                  <Route path="/verify/:id" element={<Verifier />} />
                  <Route path="/ledger" element={<Ledger />} />
                  <Route path="/student/:id" element={<Student />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
  
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </AnimatePresence>
            </main>
  
          </div>
        </Router>
      </AuthProvider>
    </BlockchainProvider>
  );
}

export default App;