import { CheckCircle2, Clock, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

const CONFIG = {
  CONFIRMED: {
    label: 'Secured',
    icon: ShieldCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    dot: 'bg-blue-600',
  },
  PENDING: {
    label: 'Pending Review',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    dot: 'bg-amber-500',
  },
  FAILED: {
    label: 'Inactive Accounts',
    icon: ShieldAlert,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    dot: 'bg-rose-500',
  },
  APPROVED: {
    label: 'Verified Portals',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'On-Chain Denied',
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    dot: 'bg-rose-500',
  },
};

/**
 * StatusBadge — Reusable indicator for institutional and certificate states.
 * @param {string} status - The status key (case-insensitive)
 * @param {boolean} pulse - Optional override to control the indicator pulse
 */
export default function StatusBadge({ status, pulse }) {
  const cfg = CONFIG[status?.toUpperCase()] || CONFIG.PENDING;
  const Icon = cfg.icon;
  const shouldPulse = pulse ?? status?.toUpperCase() === 'PENDING';

  return (
    <span
      className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${cfg.bg} ${cfg.border} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${shouldPulse ? 'animate-pulse' : ''}`} />
      <Icon size={12} className="opacity-80" />
      {cfg.label}
    </span>
  );
}
