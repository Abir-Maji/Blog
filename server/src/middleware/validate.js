const ApiError = require('../utils/ApiError');

// Validates request parts against Zod schemas: validate({ body, params, query }).
// Parsed values are exposed on req.validated (req.query is read-only in Express 5).
const validate = (schemas) => (req, res, next) => {
  const validated = {};
  const errors = [];

  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) {
      validated[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        errors.push({ field: issue.path.join('.') || part, message: issue.message });
      }
    }
  }

  if (errors.length) return next(ApiError.badRequest('Validation failed', errors));
  req.validated = validated;
  next();
};

module.exports = validate;
