import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔳 VISUAL VERIFICATION SYNTHESIS NODE
 * Generates authoritative, mobile-first QR codes for instant protocol verification.
 */

/**
 * Generates a Base64 QR code for a given certificate ID.
 * @param {string} certificateId - Unique identifier for the certificate
 * @returns {Promise<string>} Base64 Data URI of the QR code
 */
export const generateVerificationQR = async (certificateId) => {
    try {
        const clientUrlEnv = process.env.CLIENT_URL || 'http://localhost:3000';
        const primaryClientUrl = clientUrlEnv.split(',')[0].trim();
        const verifyUrl = `${primaryClientUrl}/verify?id=${certificateId}`;

        // Highly-accessible, high-trust QR design
        const qrDataUri = await QRCode.toDataURL(verifyUrl, {
            errorCorrectionLevel: 'H', // High error correction for printed surfaces
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            color: {
                dark: '#000000', // Deep black for scanning contrast
                light: '#ffffff' // Pure white background
            }
        });

        return qrDataUri;
    } catch (err) {
        console.error('❌ [QR_SYNTHESIS_FAIL]: Protocol error -', err.message);
        return null;
    }
};
