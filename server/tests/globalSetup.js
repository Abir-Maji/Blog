const { MongoMemoryServer } = require('mongodb-memory-server');

// One in-memory MongoDB for the whole run; test files share it and clean up
// after each test (see setup.js).
module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('blog-test');
  globalThis.__MONGOD__ = mongod;
};
