/**
 * SMS stub — no real SMS is sent.
 * Replace with MSG91 (or Twilio) integration before enabling phone OTP in production.
 * Integration task: Phase 1 roadmap item.
 */
export const sendPhoneOTP = async (_phoneNumber, _otp) => {
    return { sid: 'MOCK_SID_SUCCESS' };
};
