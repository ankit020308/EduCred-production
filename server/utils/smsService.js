import twilio from 'twilio';

/**
 * 📱 Mobile Identity Verification Node
 * Interfaces with Twilio to provide multi-channel OTP delivery (WhatsApp/SMS).
 */
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendPhoneOTP = async (phoneNumber, otp) => {
    // For WhatsApp: 'whatsapp:+1234567890'
    // For SMS: '+1234567890'
    const isWhatsApp = phoneNumber.startsWith('whatsapp:');
    
    return client.messages.create({
        body: `🔒 EduCred Security Node: Your cryptographic identity key is ${otp}. Expires in 5 minutes.`,
        from: isWhatsApp ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_PHONE_FROM,
        to: phoneNumber,
    });
};
