import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ─── Toast Context ─────────────────────────────────────────────────────────
import { createContext, useContext } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: {
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    bg: 'bg-emerald-500/[0.04]',
    bar: 'bg-emerald-500',
  },
  error: {
    border: 'border-rose-500/20',
    iconColor: 'text-rose-400',
    bg: 'bg-rose-500/[0.04]',
    bar: 'bg-rose-500',
  },
  info: {
    border: 'border-blue-500/20',
    iconColor: 'text-blue-400',
    bg: 'bg-blue-500/[0.04]',
    bar: 'bg-blue-500',
  },
};

const DURATION = 4000;

function ToastItem({ id, type = 'info', message, onDismiss }) {
  const s = STYLES[type];
  const Icon = ICONS[type];

  // auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), DURATION);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`relative w-full max-w-sm overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl shadow-black/40 ${s.bg} ${s.border}`}
    >
      {/* Content */}
      <div className="flex items-start gap-4 px-5 py-4">
        <Icon className={`mt-0.5 shrink-0 ${s.iconColor}`} size={18} />
        <p className="text-white text-[11px] font-semibold leading-relaxed flex-1">{message}</p>
        <button
          onClick={() => onDismiss(id)}
          className="text-slate-600 hover:text-white transition-colors shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] ${s.bar} opacity-50`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: DURATION / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

/**
 * ToastProvider — wrap your app (or a page) with this to enable toasts.
 * Usage: const { toast } = useToast(); toast.success('Done!');
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
  }, []);

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Portal-style fixed position toast stack */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto w-full">
              <ToastItem {...t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
