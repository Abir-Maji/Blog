const postService = require('../services/post.service');
const { sendSuccess } = require('../utils/apiResponse');

async function list(req, res) {
  const { items, meta } = await postService.list(req.validated.query);
  sendSuccess(res, { data: items, meta });
}

async function getBySlug(req, res) {
  const post = await postService.getBySlug(req.validated.params.slug);
  sendSuccess(res, { data: post });
}

async function create(req, res) {
  const post = await postService.create(req.user, req.validated.body);
  res.locals.activityMeta = { postId: String(post._id), title: post.title };
  sendSuccess(res, { statusCode: 201, message: 'Post created', data: post });
}

async function update(req, res) {
  const post = await postService.update(req.user, req.validated.params.id, req.validated.body);
  res.locals.activityMeta = { postId: String(post._id), title: post.title };
  sendSuccess(res, { message: 'Post updated', data: post });
}

async function remove(req, res) {
  const post = await postService.remove(req.user, req.validated.params.id);
  res.locals.activityMeta = { postId: post._id, title: post.title };
  sendSuccess(res, { message: 'Post deleted', data: post });
}

module.exports = { list, getBySlug, create, update, remove };
