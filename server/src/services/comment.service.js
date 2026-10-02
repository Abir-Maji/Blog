const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { paginate, buildMeta } = require('../utils/pagination');
const { assertOwnerOrAdmin } = require('../utils/permissions');
const notifications = require('./notification.service');

const AUTHOR_FIELDS = 'name';

async function findPostOrFail(postId, fields = '_id') {
  const post = await Post.findOne({ _id: postId, isDeleted: false }).select(fields).lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

async function listForPost(postId, { page, limit }) {
  await findPostOrFail(postId);
  const { skip } = paginate({ page, limit });
  const filter = { post: postId };
  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', AUTHOR_FIELDS).lean(),
    Comment.countDocuments(filter),
  ]);
  return { items, meta: buildMeta({ page, limit, total }) };
}

// Admin view: all comments, with just enough of the post to link to it.
async function adminList({ page, limit }) {
  const { skip } = paginate({ page, limit });
  const [items, total] = await Promise.all([
    Comment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .populate('post', 'title slug isDeleted')
      .lean(),
    Comment.countDocuments(),
  ]);
  return { items, meta: buildMeta({ page, limit, total }) };
}

async function create(user, postId, { content }) {
  const post = await findPostOrFail(postId, 'title slug author');
  const comment = await Comment.create({ post: postId, author: user.id, content });
  // timestamps: false, because a new comment is not an edit of the post.
  await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }, { timestamps: false });

  const notification = {
    type: 'comment.created',
    message: `${user.name} commented on "${post.title}"`,
    link: `/posts/${post.slug}`,
  };
  const authorId = String(post.author);
  if (authorId !== user.id) notifications.notifyUser(authorId, notification);
  // Admins see every new comment; skip the commenter and the author notified above.
  notifications.notifyAdmins(notification, { except: [user.id, authorId] });

  return { ...comment.toObject(), author: { _id: user.id, name: user.name } };
}

async function update(user, id, { content }) {
  const comment = await Comment.findById(id);
  if (!comment) throw ApiError.notFound('Comment not found');
  assertOwnerOrAdmin(user, comment.author, 'You can only edit your own comments');

  comment.content = content;
  await comment.save();
  await comment.populate('author', AUTHOR_FIELDS);
  return comment.toObject();
}

async function remove(user, id) {
  const comment = await Comment.findById(id);
  if (!comment) throw ApiError.notFound('Comment not found');
  assertOwnerOrAdmin(user, comment.author, 'You can only delete your own comments');

  await comment.deleteOne();
  await Post.updateOne(
    { _id: comment.post, commentCount: { $gt: 0 } },
    { $inc: { commentCount: -1 } },
    { timestamps: false }
  );
  return { _id: String(comment._id) };
}

module.exports = { listForPost, adminList, create, update, remove };
