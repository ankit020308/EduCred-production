import nodemailer from 'nodemailer';

/**
 * 📧 Multi-Tier Operational Email Node
 * Handles all protocol-level communications (OTP, Alerts, Credential Verification).
 */
const transporter = nodemailer.createTransport({
    service: 'gmail', // Default; should be updated via .env
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: `"EduCred Network" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔒 Secure Protocol: Verify Your Identity Node',
        html: `
            <div style="font-family: 'Inter', sans-serif; background: #010409; color: #ffffff; padding: 40px; border-radius: 20px;">
                <h1 style="color: #6366f1; font-weight: 800; letter-spacing: -0.05em; margin-bottom: 20px;">EDUSERVE.PROOF</h1>
                <p style="color: #94a3b8; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em;">Administrative Identity Node Initialization</p>
                <div style="background: rgba(99, 102, 241, 0.05); padding: 30px; border-radius: 16px; margin: 30px 0; border: 1px solid rgba(99, 102, 241, 0.1);">
                    <p style="color: #cbd5e1; font-size: 16px; margin-bottom: 10px;">Security Verification Required:</p>
                    <h2 style="color: #ffffff; font-size: 48px; font-weight: 800; margin: 0; letter-spacing: 0.2em;">${otp}</h2>
                </div>
                <p style="color: #64748b; font-size: 12px; font-style: italic;">This 6-digit cryptographic security key expires in 5 minutes. Do not share this asset with unverified nodes.</p>
                <div style="margin-top: 40px; border-top: 1px solid #1e293b; padding-top: 20px;">
                    <p style="color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">EduCred Distributed Ledger Authority</p>
                </div>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};
