import nodemailer from 'nodemailer';
import { isProduction } from './runtimeConfig.js';
import { logger } from './winstonLogger.js';

/**
 * Render free web services block outbound SMTP ports, so production can use an
 * HTTPS email provider such as Resend while preserving SMTP for local/dev.
 */
let _transporter = null;

const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 10000);

const hasResend = () => Boolean(process.env.RESEND_API_KEY);

export function getEmailProvider() {
  const configured = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (configured) return configured;
  if (hasResend()) return 'resend';
  return 'smtp';
}

export function getTransporter() {
  if (_transporter) return _transporter;

  const host     = process.env.EMAIL_HOST;
  const port     = Number(process.env.EMAIL_PORT);
  const secure   = process.env.EMAIL_SECURE === 'true';
  const user     = process.env.EMAIL_USER;
  const pass     = process.env.EMAIL_PASS;
  const fromAddr = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !fromAddr) {
    throw new Error('SMTP email service not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.');
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Only bypass TLS certificate verification in local dev (e.g., self-signed certs).
      // In production, a valid certificate chain is required to prevent MITM interception
      // of OTP emails and sensitive transactional messages.
      rejectUnauthorized: isProduction,
    },
    // Prefer IPv4 where available to avoid IPv6-only route failures.
    family: 4,
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS * 2,
  });
  return _transporter;
}

// Verify SMTP connection at startup (non-blocking, non-fatal)
if (isProduction) {
  // Skip verbose verification logs in production to avoid noise at boot
} else if (process.env.NODE_ENV !== 'test') {
  Promise.resolve().then(async () => {
    try {
      if (getEmailProvider() !== 'smtp') {
        logger.info(`[EMAIL] ${getEmailProvider()} configured`);
        return;
      }
      const t = getTransporter();
      await t.verify();
      logger.info('[EMAIL] SMTP ready');
    } catch (err) {
      logger.warn('[EMAIL] SMTP verify failed — emails will fail until fixed:', err.message);
    }
  });
}

function getFromAddress() {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('Email sender not configured. Set EMAIL_FROM.');
  }
  return from;
}

function baseMailOptions(to, subject, html) {
  return { from: getFromAddress(), to, subject, html };
}

async function sendWithResend({ from, to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend email service not configured. Set RESEND_API_KEY and EMAIL_FROM.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.message || payload?.error || `HTTP ${response.status}`;
      throw new Error(`Resend delivery failed: ${message}`);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Resend delivery timed out after ${EMAIL_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendMail(mailOptions) {
  const provider = getEmailProvider();

  if (provider === 'resend') {
    const info = await sendWithResend(mailOptions);
    return { provider, messageId: info.id };
  }

  if (provider !== 'smtp') {
    throw new Error(`Unsupported EMAIL_PROVIDER "${provider}". Supported providers: resend, smtp.`);
  }

  const info = await getTransporter().sendMail(mailOptions);
  return { provider, messageId: info.messageId };
}

function getPrimaryClientUrl() {
  const raw = process.env.CLIENT_URL || 'https://educred.in';
  // CLIENT_URL may be a comma-separated list of allowed origins; use only the first one.
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

export const sendCertificateEmail = async (to, cert) => {
  const verifyUrl = `${getPrimaryClientUrl()}/verify?id=${cert.id}`;
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

  const info = await sendMail(mailOptions);
  if (!isProduction) logger.debug(`[EMAIL] Certificate sent to ${to} via ${info.provider} (${info.messageId})`);
};

export const sendPasswordResetOTP = async (to, otp) => {
  const mailOptions = baseMailOptions(
    to,
    'EduCred — Password reset code',
    `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;padding:24px;border-radius:16px;text-align:center;">
        <h2 style="margin:0 0 12px;color:#111827;">Reset your password</h2>
        <p style="color:#4b5563;">Use this code to reset your EduCred password. If you did not request this, ignore this email.</p>
        <div style="margin:20px 0;padding:16px;background:#f3f4f6;border-radius:12px;font-size:30px;font-weight:700;letter-spacing:10px;color:#111827;">${otp}</div>
        <p style="color:#6b7280;font-size:14px;">This code expires in 15 minutes. Do not share it.</p>
      </div>
    `,
  );

  const info = await sendMail(mailOptions);
  if (!isProduction) logger.debug(`[OTP] Password reset code sent to ${to} via ${info.provider} (${info.messageId})`);
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

  const info = await sendMail(mailOptions);
  if (!isProduction) logger.debug(`[OTP] Sent to ${to} via ${info.provider} (${info.messageId})`);
};
