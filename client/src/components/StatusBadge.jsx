import { CheckCircle2, Clock, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

const CONFIG = {
  CONFIRMED: {
    label: 'Confirmed',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
  },
};

/**
 * StatusBadge — reusable pill for CONFIRMED/PENDING/FAILED/APPROVED/REJECTED
 * @param {string} status - one of the keys above
 * @param {boolean} pulse - optional pulsing dot for PENDING
 */
export default function StatusBadge({ status, pulse }) {
  const cfg = CONFIG[status?.toUpperCase()] || CONFIG.PENDING;
  const Icon = cfg.icon;
  const shouldPulse = pulse ?? status?.toUpperCase() === 'PENDING';

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.border} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${shouldPulse ? 'animate-pulse' : ''}`} />
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}
