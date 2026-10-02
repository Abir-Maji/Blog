const crypto = require('crypto');
const passport = require('../config/passport');
const env = require('../config/env');
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/apiResponse');
const { refreshCookieName, refreshCookieOptions } = require('../utils/tokens');

const OAUTH_STATE_COOKIE = 'oauthState';
const oauthStateCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: 10 * 60 * 1000,
};

// The refresh token only ever travels in an httpOnly cookie; the access token
// is returned in the body and kept in memory by the client.
function sendSession(res, session, { statusCode = 200, message }) {
  res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions);
  res.locals.actorId = session.user._id;
  return sendSuccess(res, {
    statusCode,
    message,
    data: { user: session.user, accessToken: session.accessToken },
  });
}

function clearRefreshCookie(res) {
  const { maxAge, ...options } = refreshCookieOptions;
  res.clearCookie(refreshCookieName, options);
}

async function register(req, res) {
  const session = await authService.register(req.validated.body);
  sendSession(res, session, { statusCode: 201, message: 'Account created' });
}

async function login(req, res) {
  const session = await authService.login(req.validated.body);
  sendSession(res, session, { message: 'Logged in' });
}

async function refresh(req, res) {
  try {
    const session = await authService.refresh(req.cookies[refreshCookieName]);
    sendSession(res, session, { message: 'Token refreshed' });
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

async function logout(req, res) {
  res.locals.actorId = await authService.logout(req.cookies[refreshCookieName]);
  clearRefreshCookie(res);
  sendSuccess(res, { message: 'Logged out' });
}

async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  sendSuccess(res, { data: { user } });
}

function providers(req, res) {
  sendSuccess(res, { data: env.oauth });
}

const loginRedirect = (res, error) => res.redirect(`${env.CLIENT_URL}/login?error=${error}`);

// Step 1 of the OAuth flow: redirect to the provider. A random `state` value is
// kept in a cookie and checked on the way back to prevent login CSRF.
const oauthStart = (provider, scope) => (req, res, next) => {
  if (!env.oauth[provider]) return loginRedirect(res, 'provider_not_configured');
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);
  passport.authenticate(provider, { session: false, scope, state })(req, res, next);
};

// Step 2: the provider redirects back. On success the refresh cookie is set and
// the client is sent to /oauth/callback, where it exchanges the cookie for an
// access token. No token is ever placed in the URL.
const oauthCallback = (provider) => (req, res, next) => {
  if (!env.oauth[provider]) return loginRedirect(res, 'provider_not_configured');

  const expectedState = req.cookies[OAUTH_STATE_COOKIE];
  const { maxAge, ...stateOptions } = oauthStateCookieOptions;
  res.clearCookie(OAUTH_STATE_COOKIE, stateOptions);
  if (!expectedState || req.query.state !== expectedState) return loginRedirect(res, 'oauth_failed');

  passport.authenticate(provider, { session: false }, async (err, profile) => {
    if (err || !profile) return loginRedirect(res, 'oauth_failed');
    try {
      const session = await authService.oauthLogin(profile);
      res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions);
      res.locals.actorId = session.user._id;
      res.redirect(`${env.CLIENT_URL}/oauth/callback`);
    } catch (error) {
      loginRedirect(res, error.statusCode === 403 ? 'account_deactivated' : 'oauth_failed');
    }
  })(req, res, next);
};

module.exports = { register, login, refresh, logout, me, providers, oauthStart, oauthCallback };
