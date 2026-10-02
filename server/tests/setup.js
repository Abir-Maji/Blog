const mongoose = require('mongoose');
const User = require('../src/models/User');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const ActivityLog = require('../src/models/ActivityLog');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  // Wait for indexes (unique slug/email, text search) before any test runs.
  await Promise.all([User.init(), Post.init(), Comment.init(), ActivityLog.init()]);
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({}), ActivityLog.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
});
