# EduCred: Production Readiness & Operations Guide

This guide provides a proactive checklist to ensure your EduCred instance is stable, secure, and persistent in a production environment (like Render).

## 🚀 1. Mandatory Environment Variables (Dashboard)
Ensure these are set in your Render dashboard under **Environment**.

| Key | Value Note |
|:---|:---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render Managed Postgres URL |
| `JWT_SECRET` | Strong 64-char hex string |
| `WALLET_ENCRYPTION_KEY` | Strong 32-char hex string |
| `CLIENT_URL` | `https://yourdomain.com` |

## 🛡️ 2. Security & Identity
- [ ] **Google OAuth**: If you intend to use Google Login, ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- [ ] **Callback URL**: The system now derives this from `CLIENT_URL` automatically, but you can override it with `GOOGLE_CALLBACK_URL`.
- [ ] **SMTP**: Ensure `EMAIL_USER` and `EMAIL_PASS` (App Password) are configured for OTP delivery.

## 💾 3. Storage Persistence (CRITICAL)
Render's disk is ephemeral. Local uploads will be lost on every deploy.
- [ ] **Action Required**: Configure **Pinata** (`PINATA_JWT`) or **Cloudinary** (`CLOUDINARY_URL`) in your environment variables.
- [ ] **Verification**: Visit `/api/health` and ensure `storage.persistence` is `Persistent`.

## 🗄️ 4. Database Maintenance
- [ ] **Automated Migrations**: The system now runs `node scripts/apply-hardening-migration.js` on every start.
- [ ] **Backups**: Use Render's automated backup feature for your PostgreSQL instance.

## 📈 5. Monitoring
- [ ] **Health Check**: Render is now configured to monitor `/api/health`.
- [ ] **Logs**: Monitor the Render log stream for `[WARNING]` or `[PROACTIVE AUDIT]` messages.

---
**Philosophy**: "Authenticity should be verifiable, not dependent on trust."
