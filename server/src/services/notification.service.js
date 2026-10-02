// Thin wrapper around Socket.io so services can emit notifications without
// knowing about the transport. Emits are no-ops until `init` is called, which
// keeps services usable in tests and scripts.
let io = null;

const userRoom = (userId) => `user:${userId}`;
const ADMIN_ROOM = 'admins';

function init(server) {
  io = server;
}

function build(payload) {
  return { ...payload, createdAt: new Date().toISOString() };
}

function notifyUser(userId, payload) {
  if (io) io.to(userRoom(userId)).emit('notification', build(payload));
}

// `except` lists user ids to skip: the admin who performed the action, or
// someone already notified individually.
function notifyAdmins(payload, { except = [] } = {}) {
  if (!io) return;
  let target = io.to(ADMIN_ROOM);
  for (const userId of except) target = target.except(userRoom(userId));
  target.emit('notification', build(payload));
}

module.exports = { init, notifyUser, notifyAdmins, userRoom, ADMIN_ROOM };
