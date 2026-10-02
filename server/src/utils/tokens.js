const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const REFRESH_TTL_MS = env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id || user.id), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function signRefreshToken(user) {
  // jti makes every refresh token unique, even when issued in the same second.
  return jwt.sign({ sub: String(user._id || user.id), jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d`,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Refresh tokens are stored hashed so a database leak does not expose sessions.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const refreshCookieName = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
  maxAge: REFRESH_TTL_MS,
};

module.exports = {
  REFRESH_TTL_MS,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshCookieName,
  refreshCookieOptions,
};
