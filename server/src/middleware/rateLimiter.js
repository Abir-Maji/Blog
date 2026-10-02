const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

function createRateLimiter({ windowMs, max, message = 'Too many requests, please try again later' }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    // Same error envelope as the rest of the API.
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });
}

const authLimiter = createRateLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many authentication attempts, please try again later',
});

// Refresh and logout need a valid refresh cookie and run on every page load,
// so they get a much higher limit than the credential endpoints.
const sessionLimiter = createRateLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX * 15,
});

module.exports = { createRateLimiter, authLimiter, sessionLimiter };
