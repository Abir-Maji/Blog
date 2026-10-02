const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const { paginate, buildMeta } = require('../utils/pagination');

async function getStats() {
  const [totalUsers, totalPosts, deletedPosts, totalComments] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments({ isDeleted: false }),
    Post.countDocuments({ isDeleted: true }),
    Comment.countDocuments(),
  ]);
  return { totalUsers, totalPosts, deletedPosts, totalComments };
}

async function listActivity({ page, limit }) {
  const { skip } = paginate({ page, limit });
  const [items, total] = await Promise.all([
    ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').lean(),
    ActivityLog.estimatedDocumentCount(),
  ]);
  return { items, meta: buildMeta({ page, limit, total }) };
}

module.exports = { getStats, listActivity };
