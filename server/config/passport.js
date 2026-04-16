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


      // 🛡️ All Registry calls MUST be awaited for the SQL adapter
      let user = await Registry.findOne('users', { email });



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
