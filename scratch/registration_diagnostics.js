
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Registry from '../server/services/registryService.js';
import { sendOTP } from '../server/utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runDiagnostics() {
  console.log('--- EduCred Registration Diagnostics ---');

  // 1. Check Database Connection
  console.log('\n[1/4] Checking Database Connectivity...');
  try {
    await Registry.init();
    console.log('✅ Database connected and schema verified.');
    
    const userCount = await Registry.count('users', {});
    console.log(`Current user count: ${userCount}`);
  } catch (err) {
    console.error('❌ Database connection failed!');
    console.error(err.message);
  }

  // 2. Check SMTP Configuration
  console.log('\n[2/4] Checking SMTP Configuration...');
  try {
    const from = process.env.EMAIL_FROM;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS ? '[HIDDEN]' : '[MISSING]';
    console.log(`EMAIL_FROM: ${from}`);
    console.log(`EMAIL_USER: ${user}`);
    console.log(`EMAIL_PASS: ${pass}`);
    
    if (!from || !user || !process.env.EMAIL_PASS) {
      console.error('❌ SMTP environment variables are missing!');
    } else {
      console.log('✅ SMTP environment variables present.');
    }
  } catch (err) {
    console.error('❌ SMTP configuration error!');
    console.error(err.message);
  }

  // 3. Check Joi Schemas & Controller Logic
  console.log('\n[3/4] Checking logic invariants...');
  try {
    const sampleEmail = 'test@example.com';
    const cert = await Registry.findOne('certificates', { studentEmail: sampleEmail });
    if (!cert) {
      console.log(`ℹ️ No certificate found for ${sampleEmail}. Signup for this email would fail if role is "student" (unless gate is bypassed).`);
    }
  } catch (err) {
    console.error('❌ Error querying certificates:', err.message);
  }

  // 4. Simulate University Registration Logic
  console.log('\n[4/4] Simulating University Registration logic...');
  try {
    const testData = {
      name: 'Admin User',
      email: 'uni-test-' + Date.now() + '@example.edu',
      password: 'Password@123',
      role: 'university',
      universityName: 'Diagnostic University',
      description: 'Test description content for diagnostic purposes.'
    };
    
    console.log('Inserting User...');
    const user = await Registry.insert('users', {
      name: testData.name,
      email: testData.email,
      passwordHash: 'fake_hash',
      role: testData.role,
      universityName: testData.universityName,
      otp: '123456',
      otpExpires: new Date(Date.now() + 10000),
      isEmailVerified: false
    });
    console.log('✅ User inserted:', user.id);

    console.log('Inserting University profile...');
    const uni = await Registry.insert('universities', {
      name: testData.universityName,
      email: testData.email,
      userId: user.id,
      description: testData.description,
      status: 'PENDING'
    });
    console.log('✅ University inserted:', uni.id);
    
    // Cleanup
    await Registry.delete('universities', { id: uni.id });
    await Registry.delete('users', { id: user.id });
    console.log('✅ Cleanup complete.');
  } catch (err) {
    const errorMsg = err.errors ? err.errors.map(e => `${e.path}: ${e.message}`).join(', ') : err.message;
    console.error('❌ Registration simulation failed:', errorMsg);
  }

  console.log('\n--- Diagnostics Complete ---');
  process.exit(0);
}

runDiagnostics();
