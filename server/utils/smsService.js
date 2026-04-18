/**
 * 📱 Mobile Identity Verification Mock
 * Twilio dependency removed for stabilization.
 */
export const sendPhoneOTP = async (phoneNumber, otp) => {
    console.log(`\n📱 [SMS_MOCK]: Sending OTP ${otp} to ${phoneNumber}\n`);
    return { sid: 'MOCK_SID_SUCCESS' };
};
