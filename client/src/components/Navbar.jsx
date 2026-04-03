import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, LogOut, LayoutDashboard, Globe, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/verify', label: 'Protocol Verification', icon: Search },
    { to: '/ledger', label: 'Genesis Ledger', icon: Globe },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${
      scrolled ? 'py-4' : 'py-8'
    }`}>
      <div className="container max-w-7xl mx-auto px-6">
        <div className={`glass-pane flex items-center justify-between px-8 py-3 transition-all duration-700 ${
          scrolled ? 'rounded-[2rem] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]' : 'rounded-3xl border-transparent bg-transparent shadow-none'
        }`}>
          
          {/* 🕋 LOGO SYSTEM */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} className="text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-tighter uppercase">
                EDU<span className="text-emerald-500">CRED</span>
              </span>
              <span className="text-[7px] font-black uppercase tracking-[0.4em] text-dim group-hover:text-emerald-500 transition-colors">
                High-Fidelity Protocol
              </span>
            </div>
          </Link>

          {/* 🧭 NAVIGATION NODES */}
          <div className="hidden lg:flex items-center gap-12">
            <div className="flex items-center gap-10">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-2 group ${
                    location.pathname === to ? 'text-emerald-500' : 'text-dim hover:text-white'
                  }`}
                >
                  <Icon size={12} className="group-hover:animate-pulse" />
                  {label}
                </Link>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* 👤 IDENTITY SLOTS */}
            {user ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="btn-command btn-emerald !px-6 !py-3 flex items-center gap-3"
                >
                  <LayoutDashboard size={14} />
                  Terminal
                </button>
                <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate('/profile')}
                      className="w-10 h-10 rounded-xl glass-pane flex items-center justify-center hover:border-emerald-500/30 transition-all"
                    >
                      <UserIcon size={18} className="text-dim hover:text-emerald-500" />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="text-dim hover:text-rose-500 transition-colors"
                    >
                      <LogOut size={18} />
                    </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <Link to="/login" className="text-[9px] font-black uppercase tracking-elite text-dim hover:text-white transition-colors">
                  Log In
                </Link>
                <Link to="/signup">
                  <button className="btn-command btn-emerald !px-8 !py-3.5">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* 📱 MOBILE OVERRIDE */}
          <button className="lg:hidden w-10 h-10 rounded-xl glass-pane flex items-center justify-center text-white border-white/10">
            <Menu size={20} />
          </button>

        </div>
      </div>
    </nav>
  );
}