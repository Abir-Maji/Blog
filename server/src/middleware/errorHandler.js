const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Maps known library errors onto ApiError so every failure leaves the API as
// { success: false, message, errors? }.
function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'CastError') return ApiError.badRequest(`Invalid ${err.path}`);
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest('Validation failed', errors);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return ApiError.conflict(`A record with this ${field} already exists`);
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Invalid or expired token');
  }
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');
  if (err.type === 'entity.too.large') return new ApiError(413, 'Request body is too large');

  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const known = normalise(err);

  if (!known) {
    if (!env.isTest) console.error('[error]', err);
    const body = { success: false, message: 'Internal server error' };
    if (!env.isProd) body.stack = err.stack;
    return res.status(500).json(body);
  }

  const body = { success: false, message: known.message };
  if (known.errors) body.errors = known.errors;
  res.status(known.statusCode).json(body);
}

module.exports = { notFound, errorHandler };
