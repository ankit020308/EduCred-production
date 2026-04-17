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
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${
      scrolled ? 'py-5 bg-white/95 backdrop-blur-2xl border-b border-[#E5E7EB] shadow-sm' : 'py-10 bg-transparent'
    }`}>
      <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* LOGO */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-[#2C2F33] rounded-xl flex items-center justify-center transition-all group-hover:bg-[#60A5FA]">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <span className="text-xl font-black text-[#2C2F33] tracking-tighter uppercase">Edu<span className="text-[#60A5FA]">Cred</span></span>
        </div>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden lg:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-[12px] font-black uppercase tracking-[0.2em] transition-all relative group/link ${
                  location.pathname === to ? 'text-[#60A5FA]' : 'text-[#4B5563] hover:text-[#2C2F33]'
                }`}
              >
                {label}
                {location.pathname === to && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute -bottom-4 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="w-px h-5 bg-[#E5E7EB]" />

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
                    className="w-9 h-9 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center hover:bg-slate-50 transition-all"
                  >
                    <UserIcon size={16} className="text-[#4B5563] hover:text-[#2C2F33]" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-[#4B5563] hover:text-rose-600 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <Link to="/login" className="text-[12px] font-black uppercase tracking-widest text-[#4B5563] hover:text-[#2C2F33] transition-colors">
                Log In
              </Link>
              <Link to="/signup">
                <button className="btn-primary !px-6 !py-2.5 !text-[11px] !bg-[#2C2F33]">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileOpen((current) => !current)}
          className="lg:hidden w-10 h-10 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#2C2F33]"
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
                    className="absolute left-4 right-4 top-[calc(100%+8px)] bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xl backdrop-blur-3xl lg:hidden flex flex-col gap-4"
                >
                    {navLinks.map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`rounded-xl px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                                location.pathname === to ? 'bg-blue-50 text-[#60A5FA]' : 'text-[#4B5563] hover:bg-slate-50'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                    <div className="h-px bg-[#E5E7EB] my-2" />
                    {user ? (
                        <>
                            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full !bg-[#2C2F33]">Dashboard</button>
                            <button onClick={handleLogout} className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-[#4B5563]">Log Out</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-[#4B5563]">Log In</button>
                            <button onClick={() => navigate('/signup')} className="btn-primary w-full !bg-[#2C2F33]">Get Started</button>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
