const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const env = require('./env');

// Strategies only normalise the provider profile. Finding or creating the
// user is business logic and lives in auth.service.
const toProfile = (provider) => (accessToken, refreshToken, profile, done) =>
  done(null, {
    provider,
    providerId: profile.id,
    email: profile.emails?.[0]?.value?.toLowerCase(),
    name: profile.displayName || 'User',
  });

if (env.oauth.google) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.SERVER_URL}/api/v1/auth/google/callback`,
      },
      toProfile('google')
    )
  );
}

if (env.oauth.facebook) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        callbackURL: `${env.SERVER_URL}/api/v1/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'emails'],
      },
      toProfile('facebook')
    )
  );
}

module.exports = passport;
