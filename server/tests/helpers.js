const bcrypt = require('bcryptjs');
const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const { signAccessToken } = require('../src/utils/tokens');
const { ROLES } = require('../src/constants');

const app = createApp();
const api = () => request(app);

const PASSWORD = 'Password123';
let counter = 0;

// Creates a user directly in the database and returns it with an auth header.
async function createUser(overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `user${counter}@example.com`,
    password: await bcrypt.hash(PASSWORD, 4),
    ...overrides,
  });
  const token = signAccessToken(user);
  return { user, id: String(user._id), token, auth: { Authorization: `Bearer ${token}` } };
}

const createAdmin = (overrides = {}) => createUser({ role: ROLES.ADMIN, ...overrides });

async function createPost(author, overrides = {}) {
  const res = await api()
    .post('/api/v1/posts')
    .set(author.auth)
    .send({ title: 'A test post', content: 'Some content for the test post.', ...overrides });
  return res.body.data;
}

async function createComment(author, postId, content = 'A test comment') {
  const res = await api().post(`/api/v1/posts/${postId}/comments`).set(author.auth).send({ content });
  return res.body.data;
}

module.exports = { app, api, PASSWORD, createUser, createAdmin, createPost, createComment };
