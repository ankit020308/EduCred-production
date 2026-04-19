import { sendCertificateEmail } from './emailService.js';
import { isProduction } from './runtimeConfig.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🍱 UNIFIED NOTIFICATION AGGREGATOR
 * Combines institutional Email (SMTP) and Mobile (WhatsApp/SMS) channels.
 */

// Lazily initialized — avoids a crash at startup if Twilio env vars are absent
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = (await import('twilio')).default;
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Dispatches simultaneous multi-channel alerts upon successful credential issuance.
 * @param {string} studentName - Recipient's full name
 * @param {string} course - Name of the course for the certificate
 * @param {string} universityName - Issuing institution
 * @param {string} studentEmail - Recipient's email address
 * @param {string} studentPhone - Recipient's phone number (E.164 or WhatsApp format)
 * @param {string} certId - Unique identifier for the certificate
 */
export const sendCertificateNotification = async (studentName, course, universityName, studentEmail, studentPhone, certId) => {
    console.log(`🚀 [NOTIFICATION_NODE]: Triggering alert protocol for ${studentName}...`);
    
    // ⚡ Parallel Execution to minimize latency in the background thread
    await Promise.allSettled([
        // 1. Email Channel
        sendCertificateEmail(studentEmail, {
            id: certId,
            studentName,
            course,
            issuer: universityName
        }),

        // 2. Mobile Channel (WhatsApp/SMS)
        (async () => {
            try {
                if (!twilioClient) {
                    console.warn("⚠️ [WHATSAPP_NODE]: Node offline. Twilio credentials missing.");
                    return;
                }

                const isWhatsApp = studentPhone.startsWith('whatsapp:');
                const frontendUrl = process.env.CLIENT_URL || (isProduction ? 'https://educred.in' : 'http://localhost:3000');
                const message = `🎓 EduCred Protocol: Hello ${studentName}! Your certificate for "${course}" from ${universityName} has been anchored to the blockchain. Verify here: ${frontendUrl}/verify?id=${certId}`;

                await twilioClient.messages.create({
                    body: message,
                    from: isWhatsApp ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_PHONE_FROM,
                    to: studentPhone
                });
                console.log(`✅ [WHATSAPP_NODE]: Multi-channel alert delivered to ${studentPhone}`);
            } catch (err) {
                console.error("❌ [WHATSAPP_FAIL]:", err.message);
            }
        })()
    ]);
};
