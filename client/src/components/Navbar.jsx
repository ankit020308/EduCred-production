import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, LogOut, LayoutDashboard, Globe, Search, User as UserIcon, Cpu } from 'lucide-react';
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/verify', label: 'Protocol Verification', icon: Search },
    { to: '/ledger', label: 'Genesis Ledger', icon: Globe },
    ...(user?.role?.toLowerCase() === 'super_admin' ? [
      { to: '/sys-admin/workbench', label: 'AI Labs', icon: Cpu }
    ] : [])
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${
      scrolled ? 'py-4' : 'py-8'
    }`}>
      <div className="container max-w-7xl mx-auto px-6">
        <div className={`glass-pane relative flex items-center justify-between px-6 py-3 transition-all duration-700 ${
          scrolled ? 'rounded-[2rem] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]' : 'rounded-3xl border-transparent bg-transparent shadow-none'
        }`}>
          
          {/* 🕋 LOGO SYSTEM */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} className="text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-tighter uppercase">
                EDU<span className="text-blue-500">CRED</span>
              </span>
              <span className="text-[7px] font-black uppercase tracking-[0.4em] text-dim group-hover:text-blue-500 transition-colors">
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
                    location.pathname === to ? 'text-blue-500' : 'text-dim hover:text-white'
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
                  className="btn-command btn-blue !px-6 !py-3 flex items-center gap-3"
                >
                  <LayoutDashboard size={14} />
                  Terminal
                </button>
                <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate('/profile')}
                      className="w-10 h-10 rounded-xl glass-pane flex items-center justify-center hover:border-blue-500/30 transition-all"
                    >
                      <UserIcon size={18} className="text-dim hover:text-blue-500" />
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
                  <button className="btn-command btn-blue !px-8 !py-3.5">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* 📱 MOBILE OVERRIDE */}
          <button
            onClick={() => setMobileOpen((current) => !current)}
            className="lg:hidden w-10 h-10 rounded-xl glass-pane flex items-center justify-center text-white border-white/10"
          >
            <Menu size={20} />
          </button>

          {mobileOpen ? (
            <div className="absolute left-4 right-4 top-[calc(100%+12px)] rounded-[2rem] border border-white/10 bg-[#07111f]/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden">
              <div className="flex flex-col gap-2">
                {navLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      location.pathname === to ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    {label}
                  </Link>
                ))}

                {user ? (
                  <>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="rounded-2xl bg-blue-500 px-4 py-3 text-left text-sm font-semibold text-white"
                    >
                      Open dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-slate-200"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200">
                      Log in
                    </Link>
                    <Link to="/signup" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
