import Registry from '../server/services/registryService.js';
import sequelize from '../server/config/database.js';

async function debugUser() {
    try {
        console.log('🔍 [DEBUG]: Checking database for user ankitaman0003@gmail.com...');
        console.log('🔌 [DB]: Authenticating...');
        await sequelize.authenticate().catch(err => {
            console.error('❌ [AUTH ERROR]: Authentication failed.');
            throw err;
        });
        
        console.log('🏗️  [REGISTRY]: Initializing...');
        await Registry.init();
        
        console.log(`🔎 [QUERY]: Searching for user: ankitaman0003@gmail.com (Simulation: ${Registry.isSimulation})`);
        const user = await Registry.findOne('users', { email: 'ankitaman0003@gmail.com' });
        
        if (!user) {
            console.warn('⚠️ [NOT FOUND]: No user matched that email.');
            process.exit(0);
        }
        
        console.log('✨ [MATCH FOUND]:');
        console.log(JSON.stringify({
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isGoogleUser: user.isGoogleUser,
            hasPasswordHash: !!user.passwordHash,
            createdAt: user.createdAt
        }, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('💥 [CRASH]: Debug script encountered a terminal error:');
        console.error(error);
        process.exit(1);
    }
}

debugUser();
