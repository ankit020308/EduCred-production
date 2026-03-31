import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogOut, LayoutDashboard, Globe, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './ui/Button';

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
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${
      scrolled ? 'py-4' : 'py-8'
    }`}>
      <div className="container-max">
        <div className={`relative flex items-center justify-between px-10 py-5 transition-all duration-700 ${
          scrolled 
            ? 'glass rounded-[2.5rem] shadow-2xl border-white/10 saturate-[180%] blur-3xl' 
            : 'bg-transparent border-transparent'
        }`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-5 no-underline group relative z-10">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black tracking-tighter leading-none text-white italic transition-all group-hover:tracking-tight">
                Edu<span className="text-blue-500">Cred</span>
              </span>
              <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-500 whitespace-nowrap">Institutional Node</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-14 relative z-10">
            <div className="flex items-center gap-12">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link 
                  key={to} 
                  to={to} 
                  className={`relative flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 group ${
                    location.pathname === to ? 'text-blue-500' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={14} className={`transition-transform duration-500 group-hover:scale-125 ${location.pathname === to ? 'opacity-100' : 'opacity-40'}`} />
                  {label}
                  {location.pathname === to && (
                    <motion.div layoutId="nav-active" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-white/10" />

            {user ? (
              <div className="flex items-center gap-8">
                <Link to="/dashboard">
                  <Button className="h-12 px-10">
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Button>
                </Link>
                
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/profile')}>
                   <div className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center group-hover:border-blue-500/50 transition-all">
                      <UserIcon size={18} className="text-blue-500" />
                   </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
                    className="text-slate-600 hover:text-rose-500 transition-colors"
                    title="Terminate Node Session"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-12">
                <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-blue-400 transition-all cursor-pointer">
                  Authentication
                </Link>
                <Link to="/signup">
                  <Button className="h-12 px-12">
                    Establish Node
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="lg:hidden h-12 w-12 glass rounded-xl flex items-center justify-center text-white border-white/5 relative z-10">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
}
