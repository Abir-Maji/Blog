const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { uniqueSlug } = require('../utils/slugify');
const { paginate, buildMeta } = require('../utils/pagination');
const { assertOwnerOrAdmin } = require('../utils/permissions');
const notifications = require('./notification.service');

const EXCERPT_LENGTH = 200;
const AUTHOR_FIELDS = 'name';
// List views never need the full content.
const LIST_FIELDS = 'title slug excerpt author commentCount isDeleted deletedAt createdAt updatedAt';

function makeExcerpt(content) {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
}

async function findPage(filter, { page, limit }) {
  const { skip } = paginate({ page, limit });
  const [items, total] = await Promise.all([
    Post.find(filter)
      .select(LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);
  return { items, meta: buildMeta({ page, limit, total }) };
}

function buildFilter({ search, author }) {
  const filter = {};
  if (search) filter.$text = { $search: search };
  if (author) filter.author = author;
  return filter;
}

async function list({ page, limit, search, author }) {
  return findPage({ ...buildFilter({ search, author }), isDeleted: false }, { page, limit });
}

// Admin view: can include soft-deleted posts.
async function adminList({ page, limit, search, author, status }) {
  const filter = buildFilter({ search, author });
  if (status === 'active') filter.isDeleted = false;
  if (status === 'deleted') filter.isDeleted = true;
  return findPage(filter, { page, limit });
}

async function getBySlug(slug) {
  const post = await Post.findOne({ slug, isDeleted: false }).populate('author', AUTHOR_FIELDS).lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

async function create(user, { title, content }) {
  // "new" is reserved: the client uses /posts/new for the editor.
  const slug = await uniqueSlug(title, (candidate) => candidate === 'new' || Post.exists({ slug: candidate }));
  const post = await Post.create({ title, slug, content, excerpt: makeExcerpt(content), author: user.id });

  notifications.notifyAdmins(
    { type: 'post.created', message: `${user.name} published "${post.title}"`, link: `/posts/${post.slug}` },
    { except: [user.id] }
  );

  return { ...post.toObject(), author: { _id: user.id, name: user.name } };
}

async function findActiveOrFail(id) {
  const post = await Post.findOne({ _id: id, isDeleted: false });
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

// The slug is kept when the title changes so existing links keep working.
async function update(user, id, { title, content }) {
  const post = await findActiveOrFail(id);
  assertOwnerOrAdmin(user, post.author, 'You can only edit your own posts');

  if (title !== undefined) post.title = title;
  if (content !== undefined) {
    post.content = content;
    post.excerpt = makeExcerpt(content);
  }
  await post.save();
  await post.populate('author', AUTHOR_FIELDS);
  return post.toObject();
}

// Soft delete: the post is hidden from the public API but kept in the database.
async function remove(user, id) {
  const post = await findActiveOrFail(id);
  assertOwnerOrAdmin(user, post.author, 'You can only delete your own posts');

  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();
  return { _id: String(post._id), title: post.title };
}

async function restore(id) {
  const post = await Post.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { $set: { isDeleted: false, deletedAt: null } },
    { returnDocument: 'after' }
  )
    .select(LIST_FIELDS)
    .populate('author', AUTHOR_FIELDS)
    .lean();
  if (!post) throw ApiError.notFound('Deleted post not found');
  return post;
}

module.exports = { list, adminList, getBySlug, create, update, remove, restore, makeExcerpt };
