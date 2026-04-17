import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, LogOut, LayoutDashboard, Globe, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * 🏢 PROFESSIONAL NAVBAR
 * Clean, standard enterprise SaaS navigation following the Trustworthy Tech aesthetic.
 */
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/verify', label: 'Verify', icon: Search },
    { to: '/ledger', label: 'Ledger', icon: Globe },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled ? 'py-4 bg-[#0B132B]/90 backdrop-blur-xl border-b border-white/5' : 'py-8 bg-transparent'
    }`}>
      <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* LOGO */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight uppercase">Edu<span className="text-blue-500">Cred</span></span>
        </div>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden lg:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-[12px] font-bold uppercase tracking-widest transition-all ${
                  location.pathname === to ? 'text-blue-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {user ? (
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-primary !px-5 !py-2.5 !text-[11px]"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>
              <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                  >
                    <UserIcon size={16} className="text-slate-400 hover:text-white" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <Link to="/login" className="text-[12px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                Log In
              </Link>
              <Link to="/signup">
                <button className="btn-primary !px-6 !py-2.5 !text-[11px]">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileOpen((current) => !current)}
          className="lg:hidden w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white"
        >
          <Menu size={20} />
        </button>

        {/* MOBILE MENU */}
        <AnimatePresence>
            {mobileOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute left-4 right-4 top-[calc(100%+8px)] bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-3xl lg:hidden flex flex-col gap-4"
                >
                    {navLinks.map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`rounded-xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest transition-all ${
                                location.pathname === to ? 'bg-blue-500/10 text-blue-500' : 'text-slate-400 hover:bg-white/5'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                    <div className="h-px bg-white/5 my-2" />
                    {user ? (
                        <>
                            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">Dashboard</button>
                            <button onClick={handleLogout} className="w-full py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Log Out</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="w-full py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Log In</button>
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
