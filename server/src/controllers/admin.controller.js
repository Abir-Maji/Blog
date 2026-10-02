const adminService = require('../services/admin.service');
const userService = require('../services/user.service');
const postService = require('../services/post.service');
const commentService = require('../services/comment.service');
const { sendSuccess } = require('../utils/apiResponse');

async function stats(req, res) {
  sendSuccess(res, { data: await adminService.getStats() });
}

async function activity(req, res) {
  const { items, meta } = await adminService.listActivity(req.validated.query);
  sendSuccess(res, { data: items, meta });
}

async function listUsers(req, res) {
  const { items, meta } = await userService.list(req.validated.query);
  sendSuccess(res, { data: items, meta });
}

async function updateUser(req, res) {
  const user = await userService.update(req.user, req.validated.params.id, req.validated.body);
  res.locals.activityMeta = { targetUserId: user._id, changes: req.validated.body };
  sendSuccess(res, { message: 'User updated', data: user });
}

async function deleteUser(req, res) {
  const user = await userService.remove(req.user, req.validated.params.id);
  res.locals.activityMeta = { targetUserId: user._id, name: user.name };
  sendSuccess(res, { message: 'User deleted', data: user });
}

async function listPosts(req, res) {
  const { items, meta } = await postService.adminList(req.validated.query);
  sendSuccess(res, { data: items, meta });
}

async function restorePost(req, res) {
  const post = await postService.restore(req.validated.params.id);
  res.locals.activityMeta = { postId: String(post._id), title: post.title };
  sendSuccess(res, { message: 'Post restored', data: post });
}

async function listComments(req, res) {
  const { items, meta } = await commentService.adminList(req.validated.query);
  sendSuccess(res, { data: items, meta });
}

module.exports = { stats, activity, listUsers, updateUser, deleteUser, listPosts, restorePost, listComments };
