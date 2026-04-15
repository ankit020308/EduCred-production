import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Registry from '../services/registryService.js';
import crypto from 'crypto';
import { requireEnv } from '../utils/runtimeConfig.js';

export const configurePassport = () => {
  passport.use(new GoogleStrategy({
    clientID: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    callbackURL: requireEnv('GOOGLE_CALLBACK_URL'),
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(new Error('Google profile has no email'), null);
      }

      // 🛡️ All Registry calls MUST be awaited for the SQL adapter
      let user = await Registry.findOne('users', { email });

      // 🚀 AUTO-SIGNUP LOGIC: Create user if they don't exist
      if (!user) {
        console.log(`[👤 AUTH_PROVISIONING] New identity detected: ${email}. Creating EduCred node...`);
        
        const domain = email.split('@')[1];
        let role = 'student'; // Default role
        let linkedUniversityId = null;

        // Check if domain matches any approved university
        const matchedUniversity = await Registry.findOne('universities', { officialDomain: domain, status: 'APPROVED' });
        if (matchedUniversity) {
          console.log(`[🏛️ AUTH_AFFILIATION] Domain ${domain} verified. Linking to university node: ${matchedUniversity.name}`);
          role = 'university';
          linkedUniversityId = matchedUniversity.id; // Using .id for SQL consistency
        }

        user = await Registry.insert('users', {
          name: profile.displayName || email.split('@')[0],
          displayName: profile.displayName,
          email,
          passwordHash: crypto.randomBytes(16).toString('hex'), // Secure random placeholder
          role,
          linkedUniversityId,
          isEmailVerified: true,
          isGoogleUser: true,
          provider: 'google',
          googleId: profile.id,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
          profilePhoto: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
        });
        
        console.log(`[✅ AUTH_SUCCESS] Account provisioned for: ${user.email} with role: ${user.role}`);
      } else {
        // 🔄 LINKAGE LOGIC: Update existing user with Google details if they've switched auth providers
        const update = {};
        if (!user.googleId) update.googleId = profile.id;
        if (!user.isGoogleUser) update.isGoogleUser = true;
        if (user.provider !== 'google') update.provider = 'google';
        if (!user.isEmailVerified) update.isEmailVerified = true;
        
        if (Object.keys(update).length > 0) {
          console.log(`[🔄 AUTH_LINKAGE] Mapping Google identity to existing user: ${email}`);
          await Registry.update('users', { id: user.id }, update); // Using id for SQL consistency
          user = await Registry.findById('users', user.id);
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  // Standard serialization logic
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await Registry.findById('users', id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
