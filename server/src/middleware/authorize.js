const ApiError = require('../utils/ApiError');

// Role-based access control. Use after `authenticate`:
//   router.use(authenticate, authorize(ROLES.ADMIN))
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedRoles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = authorize;
