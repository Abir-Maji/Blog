const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const tokens = require('../utils/tokens');
const notifications = require('./notification.service');

const MAX_SESSIONS_PER_USER = 5;

function toPublicUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    provider: user.provider,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function newRefreshEntry(refreshToken) {
  return {
    tokenHash: tokens.hashToken(refreshToken),
    expiresAt: new Date(Date.now() + tokens.REFRESH_TTL_MS),
  };
}

// Issues an access/refresh token pair and stores the hashed refresh token.
// `existing` is the user's current refresh token list (already filtered).
async function issueSession(user, existing = null) {
  const accessToken = tokens.signAccessToken(user);
  const refreshToken = tokens.signRefreshToken(user);
  const entry = newRefreshEntry(refreshToken);

  if (existing) {
    const refreshTokens = [...existing, entry].slice(-MAX_SESSIONS_PER_USER);
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens } });
  } else {
    await User.updateOne(
      { _id: user._id },
      { $push: { refreshTokens: { $each: [entry], $slice: -MAX_SESSIONS_PER_USER } } }
    );
  }

  return { user: toPublicUser(user), accessToken, refreshToken };
}

async function register({ name, email, password }) {
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({ name, email, password: hashed, provider: 'local' });
  notifications.notifyAdmins({ type: 'user.registered', message: `${user.name} created an account`, link: '/admin/users' });
  return issueSession(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password, to avoid revealing which accounts exist.
  const valid = user?.password && (await bcrypt.compare(password, user.password));
  if (!valid) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  return issueSession(user);
}

// Rotates the refresh token: the presented token is revoked and a new pair is
// issued. A valid token that is no longer stored has already been used, which
// suggests theft, so every session of that user is revoked.
async function refresh(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = tokens.verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw ApiError.unauthorized('Invalid or expired refresh token');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const hash = tokens.hashToken(refreshToken);
  const stored = user.refreshTokens.map((t) => ({ tokenHash: t.tokenHash, expiresAt: t.expiresAt }));
  if (!stored.some((t) => t.tokenHash === hash)) {
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    throw ApiError.unauthorized('Refresh token has already been used, please log in again');
  }

  const now = new Date();
  const remaining = stored.filter((t) => t.tokenHash !== hash && t.expiresAt > now);
  return issueSession(user, remaining);
}

async function logout(refreshToken) {
  if (!refreshToken) return null;
  const tokenHash = tokens.hashToken(refreshToken);
  const user = await User.findOneAndUpdate(
    { 'refreshTokens.tokenHash': tokenHash },
    { $pull: { refreshTokens: { tokenHash } } }
  ).select('_id');
  return user ? String(user._id) : null;
}

// Finds the account for a social profile, linking by email to an existing
// account, or creates a new one.
async function oauthLogin({ provider, providerId, email, name }) {
  const idField = `${provider}Id`;

  let user = await User.findOne({ [idField]: providerId });
  if (!user && email) {
    user = await User.findOne({ email });
    if (user) {
      user[idField] = providerId;
      await user.save();
    }
  }
  if (!user) {
    user = await User.create({ name, email, provider, [idField]: providerId });
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  return issueSession(user);
}

async function getProfile(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

module.exports = { register, login, refresh, logout, oauthLogin, getProfile, toPublicUser };
