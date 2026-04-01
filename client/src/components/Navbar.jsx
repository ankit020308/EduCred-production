import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, LogOut, LayoutDashboard, Globe, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

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
    { to: '/ledger', label: 'Public Ledger', icon: Globe },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled ? 'py-4' : 'py-6'
    }`}>
      <div className="container max-w-7xl mx-auto px-6">
        <div className={`flex items-center justify-between px-8 py-4 transition-all duration-500 border border-white/5 ${
          scrolled 
            ? 'bg-[#0b1121]/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border-white/10' 
            : 'bg-transparent'
        }`}>
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 no-underline group relative z-10 transition-transform active:scale-95">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-all duration-300">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white">
                Edu<span className="text-indigo-500">Cred</span>
              </span>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[8px] uppercase font-bold tracking-[0.3em] text-slate-500 whitespace-nowrap">Quantum Ledger Protocol</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10 relative z-10">
            <div className="flex items-center gap-8">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link 
                  key={to} 
                  to={to} 
                  className={`relative flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 group ${
                    location.pathname === to ? 'text-indigo-400' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Icon size={14} className={location.pathname === to ? 'opacity-100' : 'opacity-40'} />
                  {label}
                  {location.pathname === to && (
                    <motion.div layoutId="nav-active" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            <div className="h-6 w-[1px] bg-white/10" />

            {user ? (
              <div className="flex items-center gap-6">
                <Link to="/dashboard">
                  <button className="h-10 px-6 rounded-xl bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2">
                    <LayoutDashboard size={14} />
                    Panel
                  </button>
                </Link>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate('/profile')}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group"
                  >
                    <UserIcon size={18} className="text-indigo-400 group-hover:text-white transition-colors" />
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="text-slate-600 hover:text-rose-500 transition-colors"
                    title="Terminate Session"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-all">
                  Access Node
                </Link>
                <Link to="/signup">
                  <button className="h-11 px-8 rounded-xl bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-white/5">
                    Issue Certificate
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="lg:hidden h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 relative z-10 hover:bg-white/10 transition-all">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
