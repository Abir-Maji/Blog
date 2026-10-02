const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { paginate, buildMeta } = require('../utils/pagination');
const { toPublicUser } = require('./auth.service');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function list({ page, limit, search }) {
  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const { skip } = paginate({ page, limit });
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items: users.map(toPublicUser), meta: buildMeta({ page, limit, total }) };
}

async function update(actor, id, { role, isActive }) {
  // Prevents an admin from locking themselves out of the admin panel.
  if (String(id) === actor.id) throw ApiError.badRequest('You cannot change your own role or status');

  const changes = {};
  if (role !== undefined) changes.role = role;
  if (isActive !== undefined) {
    changes.isActive = isActive;
    // Deactivating an account also ends its sessions.
    if (!isActive) changes.refreshTokens = [];
  }

  const user = await User.findByIdAndUpdate(id, { $set: changes }, { returnDocument: 'after' }).lean();
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

// Removes the account and its comments, and soft-deletes its posts.
async function remove(actor, id) {
  if (String(id) === actor.id) throw ApiError.badRequest('You cannot delete your own account');

  const user = await User.findByIdAndDelete(id).lean();
  if (!user) throw ApiError.notFound('User not found');

  const perPost = await Comment.aggregate([
    { $match: { author: user._id } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ]);
  if (perPost.length) {
    await Comment.deleteMany({ author: user._id });
    await Post.bulkWrite(
      perPost.map(({ _id, count }) => ({
        updateOne: { filter: { _id }, update: { $inc: { commentCount: -count } }, timestamps: false },
      }))
    );
  }
  await Post.updateMany({ author: user._id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } });

  return { _id: String(user._id), name: user.name };
}

module.exports = { list, update, remove };
