import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Menu, LogOut, LayoutDashboard, Globe, Search, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navLinks = [
    { to: '/verify', label: 'Verify', icon: Search },
    { to: '/ledger', label: 'Ledger', icon: Globe },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled ? 'py-4 bg-white/95 backdrop-blur-2xl border-b border-[#e0e0e0]' : 'py-8 bg-transparent'
    }`}>
      <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-9 h-9 bg-[#202020] rounded-xl flex items-center justify-center transition-all group-hover:bg-[#ea2804]">
            <ShieldCheck className="text-white" size={18} />
          </div>
          <span className="text-lg font-black text-[#202020] tracking-tight">
            Edu<span className="text-[#ea2804]">Cred</span>
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex items-center gap-6">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`text-[11px] font-black uppercase tracking-widest transition-all relative ${
                  location.pathname === to ? 'text-[#ea2804]' : 'text-[#646464] hover:text-[#202020]'
                }`}>
                {label}
                {location.pathname === to && (
                  <motion.div layoutId="nav-underline"
                    className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#ea2804]" />
                )}
              </Link>
            ))}
          </div>

          <div className="w-px h-4 bg-[#e0e0e0]" />

          {user ? (
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="btn-primary !px-4 !py-2 !text-[10px]">
                <LayoutDashboard size={13} /> Dashboard
              </button>
              <button onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-lg bg-[#f6f6f6] border border-[#e0e0e0] flex items-center justify-center hover:border-[#ea2804] transition-all">
                <UserIcon size={14} className="text-[#646464]" />
              </button>
              <button onClick={handleLogout}
                className="text-[#646464] hover:text-[#ea2804] transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <Link to="/login" className="text-[11px] font-black uppercase tracking-widest text-[#646464] hover:text-[#202020] transition-colors">
                Log In
              </Link>
              <Link to="/signup">
                <button className="btn-primary !px-5 !py-2 !text-[10px]">Get Started</button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(p => !p)}
          className="lg:hidden w-9 h-9 rounded-lg bg-[#f6f6f6] border border-[#e0e0e0] flex items-center justify-center text-[#202020]">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="absolute left-4 right-4 top-[calc(100%+6px)] bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-xl lg:hidden flex flex-col gap-3">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to}
                  className={`rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    location.pathname === to ? 'bg-[#ea2804]/10 text-[#ea2804]' : 'text-[#646464] hover:bg-[#f6f6f6]'
                  }`}>
                  {label}
                </Link>
              ))}
              <div className="h-px bg-[#e0e0e0]" />
              {user ? (
                <>
                  <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">Dashboard</button>
                  <button onClick={handleLogout} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-[#646464] flex items-center justify-center gap-2">
                    <LogOut size={13} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-[#646464]">Log In</button>
                  <button onClick={() => navigate('/signup')} className="btn-primary w-full">Get Started</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
