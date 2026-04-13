import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import University from '../models/University.js';
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

      let user = await User.findOne({ email });

      // 🚀 AUTO-SIGNUP LOGIC: Create user if they don't exist
      if (!user) {
        console.log(`[👤 AUTH_PROVISIONING] New identity detected: ${email}. Creating EduCred node...`);
        
        const domain = email.split('@')[1];
        let role = 'student'; // Default role
        let linkedUniversityId = null;

        // Check if domain matches any approved university
        const matchedUniversity = await University.findOne({ officialDomain: domain, status: 'APPROVED' });
        if (matchedUniversity) {
          console.log(`[🏛️ AUTH_AFFILIATION] Domain ${domain} verified. Linking to university node: ${matchedUniversity.name}`);
          role = 'university';
          linkedUniversityId = matchedUniversity._id;
        }

        user = await User.create({
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
        let updated = false;
        if (!user.googleId) { user.googleId = profile.id; updated = true; }
        if (!user.isGoogleUser) { user.isGoogleUser = true; updated = true; }
        if (user.provider !== 'google') { user.provider = 'google'; updated = true; }
        if (!user.isEmailVerified) { user.isEmailVerified = true; updated = true; }
        
        if (updated) {
          console.log(`[🔄 AUTH_LINKAGE] Mapping Google identity to existing user: ${email}`);
          await user.save();
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  // Not strictly using sessions since we're using JWTs mostly, but good practice
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
