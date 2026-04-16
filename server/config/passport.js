import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Registry from '../services/registryService.js';
import crypto from 'crypto';
import { requireEnv } from '../utils/runtimeConfig.js';

/**
 * 🔒 Passport Configuration Node
 * Handles Google OAuth identity resolution and SQL persistence anchoring.
 */
export const configurePassport = () => {
  passport.use(new GoogleStrategy({
    clientID: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    callbackURL: requireEnv('GOOGLE_CALLBACK_URL'),
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;

      // 🛡️ All Registry calls MUST be awaited for the SQL adapter
      let user = await Registry.findOne('users', { email });

      // If user doesn't exist, create a new record (standard OAuth provisioning)
      if (!user) {
        user = await Registry.create('users', {
          id: crypto.randomUUID(),
          email,
          name,
          role: 'user', // Default role; Admin must elevate manually
          isVerified: true,
          authType: 'google'
        });
      }

      return done(null, user);
    } catch (err) {
      console.error('[PASSPORT_ERROR]:', err);
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
