import { sendOTP } from '../utils/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testEmail = async () => {
    const targetEmail = process.argv[2] || process.env.EMAIL_USER;

    if (!targetEmail) {
        console.error("❌ Error: No target email provided.");
        process.exit(1);
    }

    console.log(`🧪 Testing EduCred Email Protocol (Ethereal Automated Mode)...`);
    
    try {
        const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await sendOTP(targetEmail, testOtp);
        console.log(`\n✨ Test sequence complete.`);
    } catch (error) {
        console.error(`\n💥 Protocol Breakdown: ${error.message}`);
    }
};

testEmail();
