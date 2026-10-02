const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccessToken } = require('../utils/tokens');
const notifications = require('../services/notification.service');
const { ROLES } = require('../constants');

// Real-time notifications. Sockets authenticate with the same JWT access token
// as the REST API and join a private room, plus the admin room for admins.
function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(notifications.userRoom(socket.data.userId));
    if (socket.data.role === ROLES.ADMIN) socket.join(notifications.ADMIN_ROOM);
  });

  notifications.init(io);
  return io;
}

module.exports = initSockets;
