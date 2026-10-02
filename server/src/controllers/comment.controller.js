const commentService = require('../services/comment.service');
const { sendSuccess } = require('../utils/apiResponse');

async function listForPost(req, res) {
  const { items, meta } = await commentService.listForPost(req.validated.params.postId, req.validated.query);
  sendSuccess(res, { data: items, meta });
}

async function create(req, res) {
  const comment = await commentService.create(req.user, req.validated.params.postId, req.validated.body);
  res.locals.activityMeta = { commentId: String(comment._id), postId: req.validated.params.postId };
  sendSuccess(res, { statusCode: 201, message: 'Comment added', data: comment });
}

async function update(req, res) {
  const comment = await commentService.update(req.user, req.validated.params.id, req.validated.body);
  res.locals.activityMeta = { commentId: String(comment._id) };
  sendSuccess(res, { message: 'Comment updated', data: comment });
}

async function remove(req, res) {
  const comment = await commentService.remove(req.user, req.validated.params.id);
  res.locals.activityMeta = { commentId: comment._id };
  sendSuccess(res, { message: 'Comment deleted', data: comment });
}

module.exports = { listForPost, create, update, remove };
