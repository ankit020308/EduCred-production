// Issuance limits per plan (per calendar month). -1 = unlimited.
export const PLANS = Object.freeze({
  free: {
    label: 'Free',
    issuanceLimit: 25,
    razorpayPlanId: null,
  },
  pro: {
    label: 'Pro',
    issuanceLimit: 500,
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || null,
  },
  enterprise: {
    label: 'Enterprise',
    issuanceLimit: -1, // unlimited
    razorpayPlanId: process.env.RAZORPAY_ENTERPRISE_PLAN_ID || null,
  },
});

export const DEFAULT_PLAN = 'free';
