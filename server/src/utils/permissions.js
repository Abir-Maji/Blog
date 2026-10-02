const ApiError = require('./ApiError');
const { ROLES } = require('../constants');

// Owners may modify their own resources; admins may modify anything.
function assertOwnerOrAdmin(user, ownerId, message) {
  if (user.role === ROLES.ADMIN) return;
  if (String(ownerId) === String(user.id)) return;
  throw ApiError.forbidden(message);
}

module.exports = { assertOwnerOrAdmin };
