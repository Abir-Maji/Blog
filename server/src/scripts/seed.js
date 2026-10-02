const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const { ROLES } = require('../constants');

// Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD if it does not
// exist yet. Runs on every server start and is safe to repeat.
async function ensureAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return null;

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      existing.role = ROLES.ADMIN;
      await existing.save();
    }
    return existing;
  }

  const password = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  const admin = await User.create({ name: env.ADMIN_NAME, email, password, role: ROLES.ADMIN });
  console.log(`[seed] admin account created: ${email}`);
  return admin;
}

module.exports = { ensureAdmin };

const DEMO_PASSWORD = 'Password123';

// `npm run seed`: the admin account plus demo authors, posts and comments
// from seedData.json. Posts are only added to an empty database.
if (require.main === module) {
  const { connectDB, disconnectDB } = require('../config/db');
  const postService = require('../services/post.service');
  const commentService = require('../services/comment.service');
  const Post = require('../models/Post');
  const data = require('./seedData.json');

  (async () => {
    await connectDB();
    const admin = await ensureAdmin();
    if (!admin) console.log('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin account');

    const authors = {};
    const password = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);
    for (const { key, name, email } of data.authors) {
      const user = (await User.findOne({ email })) || (await User.create({ name, email, password }));
      authors[key] = { id: String(user._id), name: user.name, role: user.role };
    }
    console.log(`[seed] ${data.authors.length} demo authors ready (password: ${DEMO_PASSWORD})`);

    if ((await Post.countDocuments()) === 0) {
      const postIds = {};
      for (const { author, title, content } of data.posts) {
        const post = await postService.create(authors[author], { title, content });
        postIds[title] = String(post._id);
      }
      for (const { post, author, content } of data.comments) {
        await commentService.create(authors[author], postIds[post], { content });
      }
      console.log(`[seed] ${data.posts.length} posts and ${data.comments.length} comments created`);
    } else {
      console.log('[seed] posts already exist, none added');
    }

    await disconnectDB();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
