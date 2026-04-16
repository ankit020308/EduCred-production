import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Load environment from the server root
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

async function runAuthDiagnostics() {
    console.log('\n─── 🛡️ EDUCRED AUTH DIAGNOSTICS ───\n');

    // 1. Google OAuth Check
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleCallback = process.env.GOOGLE_CALLBACK_URL;
    
    console.log('📡 [GOOGLE OAUTH]:');
    console.log(`   - Client ID: ${googleClientId ? googleClientId.slice(0, 10).padEnd(20, '*') : 'MISSING'}`);
    console.log(`   - Configured Callback: ${googleCallback || 'MISSING'}`);
    
    // Logic for helping the user resolve URI Mismatch
    if (googleCallback) {
        if (!googleCallback.includes('localhost:5001')) {
            console.warn('   ⚠️ [WARNING]: Callback URL doesn\'t match localhost:5001. Ensure this is intentional.');
        }
        console.log('\n   👉 [ACTION REQUIRED]: Ensure the following URL is added to your');
        console.log('      Google Cloud Console → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs:');
        console.log(`      ${googleCallback}\n`);
    }

    // 2. SMTP Check
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const from = process.env.EMAIL_FROM;

    console.log('📧 [SMTP CONFIGURATION]:');
    console.log(`   - Host: ${host || 'MISSING'}`);
    console.log(`   - User: ${user || 'MISSING'}`);
    console.log(`   - From: ${from || 'MISSING'}`);

    if (host && port && user && pass) {
        console.log(`\n📡 Testing SMTP connection to ${host}:${port}...`);
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: { user, pass }
        });

        try {
            await transporter.verify();
            console.log('   ✅ [SMTP SUCCESS]: Connection verified. Email delivery is operational.');
        } catch (error) {
            console.error('   ❌ [SMTP FAILED]:', error.message);
            if (error.message.includes('Invalid login')) {
                console.info('      💡 [TIP]: For Gmail, ensure you are using a 16-character "App Password".');
            }
        }
    } else {
        console.error('   ❌ [SMTP MISSING]: Incomplete configuration in .env');
    }

    console.log('\n───────────────────────────────────\n');
}

runAuthDiagnostics();
