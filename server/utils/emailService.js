import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 📧 INSTITUTIONAL NOTIFICATION NODE
 * Dispatches high-fidelity credential alerts to students once consensus is reached.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail', // or use host/port for professional SMTP
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ⚡ PROTOCOL DIAGNOSTICS: Verify node connection on startup
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter.verify((error, success) => {
        if (error) {
            console.error("❌ [EMAIL_DIAGNOSTIC]: Protocol handshake failed -", error.message);
        } else {
            console.log("✅ [EMAIL_DIAGNOSTIC]: Notification node ready for dispatch.");
        }
    });
}

/**
 * Sends a branded certificate issuance alert.
 * @param {string} to - Student email
 * @param {Object} cert - Certificate metadata
 */
export const sendCertificateEmail = async (to, cert) => {
    const isProd = process.env.NODE_ENV === 'production';
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify?id=${cert._id}`;

    const mailOptions = {
        from: `"EduCred Protocol" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `📜 New Credential Issued: ${cert.course}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e1e1e1; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Identity Protocol: Credential Issued</h2>
                <p>Hello <strong>${cert.studentName}</strong>,</p>
                <p>A new academic credential has been anchored to the decentralized ledger on your behalf by <strong>${cert.issuer}</strong>.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 0.9em; color: #64748b;">COURSE</p>
                    <p style="margin: 5px 0 15px; font-weight: bold;">${cert.course}</p>
                    
                    <p style="margin: 0; font-size: 0.9em; color: #64748b;">CERTIFICATE ID</p>
                    <p style="margin: 5px 0 15px; font-family: monospace; font-size: 0.85em;">${cert._id}</p>
                    
                    <p style="margin: 0; font-size: 0.9em; color: #64748b;">BLOCKCHAIN ANCHOR (SHA-256)</p>
                    <p style="margin: 5px 0; font-family: monospace; font-size: 0.75em; word-break: break-all; color: #4f46e5;">${cert.certificateHash}</p>
                </div>

                <a href="${verifyUrl}" style="display: block; text-align: center; background: #000; color: #fff; text-decoration: none; padding: 12px; border-radius: 6px; font-weight: bold; margin-top: 20px;">
                    Verify Authenticity
                </a>

                <p style="font-size: 0.8em; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    This is an authoritative system message from the EduCred Protocol. If you did not expect this, please contact your academic institution.
                </p>
            </div>
        `
    };

    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("⚠️ [EMAIL_NODE]: Node offline. Credentials missing in variables. Email suppressed.");
            return;
        }
        await transporter.sendMail(mailOptions);
        console.log(`📧 [EMAIL_NODE]: Notification dispatched to ${to}`);
    } catch (error) {
        console.error("❌ [EMAIL_FAIL]: Protocol interrupted -", error.message);
    }
};

/**
 * Sends a cryptographic identity key (OTP) for node activation.
 * @param {string} to - User email
 * @param {string} otp - 6-digit cryptographic key
 */
export const sendOTP = async (to, otp) => {
    const mailOptions = {
        from: `"EduCred Protocol" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `🔑 Security Key: Identity Activation`,
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #e1e1e1; padding: 30px; border-radius: 15px; text-align: center;">
                <h2 style="color: #3b82f6; margin-bottom: 20px;">Identity Activation</h2>
                <p style="color: #64748b;">Your cryptographic identity key for node activation is:</p>
                <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #1e293b;">${otp}</span>
                </div>
                <p style="font-size: 0.85em; color: #94a3b8;">This key expires in 10 minutes. If you did not request this, please disregard.</p>
                <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; pt: 20px;">
                    <p style="font-size: 0.75em; color: #cbd5e1; uppercase; tracking: 0.2em;">EduCred Decentralized Node Network</p>
                </div>
            </div>
        `
    };

    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("⚠️ [OTP_EMAIL_NODE]: Node offline. Credentials missing. Suppressing delivery.");
            return;
        }
        await transporter.sendMail(mailOptions);
        console.log(`✅ [OTP_EMAIL]: Security key dispatched to ${to}`);
    } catch (error) {
        console.error("❌ [OTP_EMAIL_FAIL]:", error.message);
    }
};
