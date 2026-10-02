const http = require('http');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');
const initSockets = require('./sockets');
const { ensureAdmin } = require('./scripts/seed');

async function start() {
  await connectDB();
  await ensureAdmin();

  const server = http.createServer(createApp());
  const io = initSockets(server);

  server.listen(env.PORT, () => {
    console.log(`[server] API listening on ${env.SERVER_URL}/api/v1 (${env.NODE_ENV})`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    io.close();
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
