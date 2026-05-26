// Canonical certificate status configuration used by Admin, SystemAdmin, and StudentDashboard.
// Each entry contains both pill-style (bg/text/border/dot) and badge-style (badgeBg) properties
// so each consumer can use whichever subset it needs.
export const CERT_STATUS = {
  CONFIRMED: {
    label:    'Verified On-Chain',
    bg:       'bg-[#2b9a66]/10',
    text:     'text-[#2b9a66]',
    border:   'border-[#2b9a66]/20',
    dot:      'bg-[#2b9a66]',
    badgeBg:  'bg-[#2b9a66]',
  },
  PENDING_REVIEW: {
    label:    'Pending Review',
    bg:       'bg-amber-50',
    text:     'text-amber-600',
    border:   'border-amber-200',
    dot:      'bg-amber-500',
    badgeBg:  'bg-amber-500',
  },
  PROCESSING: {
    label:    'Under Review',
    bg:       'bg-blue-50',
    text:     'text-blue-600',
    border:   'border-blue-200',
    dot:      'bg-blue-500',
    badgeBg:  'bg-blue-500',
  },
  ANCHOR_FAILED: {
    label:    'Anchor Failed',
    bg:       'bg-[#ea2804]/10',
    text:     'text-[#ea2804]',
    border:   'border-[#ea2804]/20',
    dot:      'bg-[#ea2804]',
    badgeBg:  'bg-[#ea2804]',
  },
  ANCHOR_PENDING_FUNDS: {
    label:    'Awaiting Funds',
    bg:       'bg-orange-50',
    text:     'text-orange-600',
    border:   'border-orange-200',
    dot:      'bg-orange-500',
    badgeBg:  'bg-orange-500',
  },
  REJECTED: {
    label:    'Rejected',
    bg:       'bg-[#ea2804]/10',
    text:     'text-[#ea2804]',
    border:   'border-[#ea2804]/20',
    dot:      'bg-[#ea2804]',
    badgeBg:  'bg-[#ea2804]',
  },
  REVOKED: {
    label:    'Revoked',
    bg:       'bg-[#202020]/5',
    text:     'text-[#202020]',
    border:   'border-[#202020]/10',
    dot:      'bg-[#202020]',
    badgeBg:  'bg-[#202020]',
  },
  default: {
    label:    'Processing',
    bg:       'bg-[#f6f6f6]',
    text:     'text-[#646464]',
    border:   'border-[#e0e0e0]',
    dot:      'bg-[#646464]',
    badgeBg:  'bg-[#646464]',
  },
};
