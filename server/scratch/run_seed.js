import Registry from '../services/registryService.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

async function runSeed() {
    console.log('--- 🚀 Seeding System Authority ---');
    try {
        await Registry.init();
        
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (!adminEmail || !adminPassword) {
            console.error('❌ Error: Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
            process.exit(1);
        }

        const adminExists = await Registry.findOne('users', { email: adminEmail });
        if (adminExists) {
            console.log(`✅ Skip: Admin ${adminEmail} already exists.`);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPassword, salt);

        await Registry.insert('users', {
            name: 'System Controller',
            email: adminEmail,
            passwordHash: hash,
            role: 'admin',
            isEmailVerified: true,
            walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
        });

        console.log(`✅ Success: Global Admin established (${adminEmail})`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

runSeed();
