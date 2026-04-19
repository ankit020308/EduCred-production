import nodemailer from 'nodemailer';
import { isProduction } from './runtimeConfig.js';

/**
 * Lazily creates the SMTP transporter so that missing env vars
 * throw at call-time (with a clear error) rather than crashing
 * the server on import.
 */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host     = process.env.EMAIL_HOST;
  const port     = Number(process.env.EMAIL_PORT);
  const secure   = process.env.EMAIL_SECURE === 'true';
  const user     = process.env.EMAIL_USER;
  const pass     = process.env.EMAIL_PASS;
  const fromAddr = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !fromAddr) {
    throw new Error(
      'Email service not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.'
    );
  }

  _transporter = nodemailer.createTransport({ 
    host, 
    port, 
    secure, 
    auth: { user, pass },
    // 🛡️ RESILIENCE: Prevent long hangs on flaky SMTP connections
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000, 
    socketTimeout: 20000 
  });
  return _transporter;
}

// Verify SMTP connection at startup (non-blocking, non-fatal)
if (isProduction) {
  // Skip verbose verification logs in production to avoid noise at boot
} else if (process.env.NODE_ENV !== 'test') {
  Promise.resolve().then(async () => {
    try {
      const t = getTransporter();
      await t.verify();
      console.log('[EMAIL] SMTP ready');
    } catch (err) {
      console.warn('[EMAIL] SMTP verify failed — emails will fail until fixed:', err.message);
    }
  });
}

function baseMailOptions(to, subject, html) {
  return { from: process.env.EMAIL_FROM, to, subject, html };
}

export const sendCertificateEmail = async (to, cert) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify?id=${cert.id}`;
  const mailOptions = baseMailOptions(
    to,
    `Certificate issued: ${cert.course}`,
    `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;padding:24px;border-radius:16px;">
        <h2 style="margin:0 0 12px;color:#111827;">Your certificate is ready</h2>
        <p style="color:#4b5563;">Hello <strong>${cert.studentName}</strong>,</p>
        <p style="color:#4b5563;">A new credential has been issued for <strong>${cert.course}</strong>.</p>
        <p style="color:#4b5563;">Certificate ID: <strong>${cert.id}</strong></p>
        <p style="color:#4b5563;word-break:break-all;">Hash: <strong>${cert.certificateHash}</strong></p>
        <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;">
          Verify certificate
        </a>
      </div>
    `,
  );

  const info = await getTransporter().sendMail(mailOptions);
  if (!isProduction) console.log(`[EMAIL] Certificate sent to ${to} (${info.messageId})`);
};

export const sendOTP = async (to, otp) => {
  const mailOptions = baseMailOptions(
    to,
    'EduCred — Your verification code',
    `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;padding:24px;border-radius:16px;text-align:center;">
        <h2 style="margin:0 0 12px;color:#111827;">Verify your email</h2>
        <p style="color:#4b5563;">Use this one-time code to finish your EduCred sign up.</p>
        <div style="margin:20px 0;padding:16px;background:#f3f4f6;border-radius:12px;font-size:30px;font-weight:700;letter-spacing:10px;color:#111827;">${otp}</div>
        <p style="color:#6b7280;font-size:14px;">This code expires in 10 minutes. Do not share it.</p>
      </div>
    `,
  );

  const info = await getTransporter().sendMail(mailOptions);
  if (!isProduction) console.log(`[OTP] Sent to ${to} (${info.messageId})`);
};
