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
        <div className={`glass-pane relative flex items-center justify-between px-8 py-3 transition-all duration-700 ${
          scrolled ? 'rounded-[2rem] border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] bg-black/60 backdrop-blur-3xl' : 'rounded-3xl border-transparent bg-transparent shadow-none'
        }`}>
          
          {/* 🕋 LOGO SYSTEM */}
          <div className="relative z-10 flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-[#0A0A0A] border border-cyan-400/20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)] group hover:border-cyan-400 transition-all duration-700">
              <Hexagon className="text-cyan-400 group-hover:rotate-90 transition-transform duration-700" size={24} />
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-tighter block uppercase">Edu<span className="text-cyan-400">Cred</span></span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">Global Authentication Node</span>
            </div>
          </div>

          {/* 🧭 NAVIGATION NODES */}
          <div className="hidden lg:flex items-center gap-12">
            <div className="flex items-center gap-10">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-2 group ${
                    location.pathname === to ? 'text-cyan-400' : 'text-slate-800 hover:text-white'
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
                      className="w-10 h-10 rounded-xl glass-pane flex items-center justify-center hover:border-cyan-400/30 transition-all shadow-inner"
                    >
                      <UserIcon size={18} className="text-slate-800 hover:text-cyan-400 transition-colors" />
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
              <div className="flex items-center gap-10">
                <Link to="/login" className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800 hover:text-white transition-colors">
                  Authorize
                </Link>
                <Link to="/signup">
                  <button className="btn-command btn-blue !px-8 !py-3.5 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    Initiate
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
            <div className="absolute left-4 right-4 top-[calc(100%+12px)] rounded-[2.5rem] border border-white/5 bg-[#050505]/95 p-6 shadow-2xl backdrop-blur-3xl lg:hidden scanline-overlay sm:border">
              <div className="flex flex-col gap-3">
                {navLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all ${
                      location.pathname === to ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-700 hover:bg-white/[0.03]'
                    }`}
                  >
                    {label}
                  </Link>
                ))}

                {user ? (
                  <>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="btn-command btn-blue w-full !py-4"
                    >
                      Terminal Access
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-2xl border border-white/5 bg-[#111111] px-6 py-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-800"
                    >
                      Terminate Session
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-2xl border border-white/5 bg-[#111111] px-6 py-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-800">
                      Authorize
                    </Link>
                    <Link to="/signup" className="btn-command btn-blue w-full !py-4">
                      Initiate Protocol
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
