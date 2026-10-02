const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('./env');

let embedded = null;

// Development convenience: when MONGO_URI is not set, run a local MongoDB
// through mongodb-memory-server and persist its data under server/.data.
async function startEmbeddedMongo() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.join(__dirname, '..', '..', '.data');
  fs.mkdirSync(dbPath, { recursive: true });
  embedded = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger' },
  });
  return embedded.getUri('blog');
}

async function connectDB() {
  let uri = env.MONGO_URI;
  if (!uri) {
    if (env.isProd) throw new Error('MONGO_URI is required in production');
    console.log('[db] MONGO_URI not set, starting embedded MongoDB (data in server/.data)');
    uri = await startEmbeddedMongo();
  }
  await mongoose.connect(uri);
  console.log(`[db] connected to ${mongoose.connection.name}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (embedded) await embedded.stop({ doCleanup: false });
}

module.exports = { connectDB, disconnectDB };
