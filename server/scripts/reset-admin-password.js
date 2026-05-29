import '../utils/envLoader.js';
import Registry from '../services/registryService.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function resetAdminPassword() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('[FAIL] ADMIN_EMAIL or ADMIN_PASSWORD is not set in .env');
    process.exit(1);
  }

  console.log(`\n--- EduCred Admin Password Reset ---`);
  console.log(`Target: ${adminEmail}\n`);

  try {
    await Registry.init();

    const user = await Registry.findOne('users', { email: adminEmail });
    if (!user) {
      console.error(`[FAIL] No user found with email: ${adminEmail}`);
      process.exit(1);
    }

    console.log(`[INFO] Found user: ${user.name} (role: ${user.role})`);

    const newHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    await Registry.update('users', { email: adminEmail }, { passwordHash: newHash, isEmailVerified: true });

    console.log(`[SUCCESS] Password hash updated for ${adminEmail}`);
    console.log('You can now log in with the password set in ADMIN_PASSWORD.\n');
    process.exit(0);
  } catch (err) {
    console.error('[FAIL] Error:', err.message);
    process.exit(1);
  }
}

resetAdminPassword();
