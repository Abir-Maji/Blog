const { Router } = require('express');
const controller = require('../../controllers/post.controller');
const commentController = require('../../controllers/comment.controller');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const logActivity = require('../../middleware/activityLogger');
const schemas = require('../../validators/post.validator');
const commentSchemas = require('../../validators/comment.validator');
const { idParams, paginationQuery } = require('../../validators/common');
const { ACTIONS } = require('../../constants');

const router = Router();

router.get('/', validate({ query: schemas.listQuery }), controller.list);
router.get('/:slug', validate({ params: schemas.slugParams }), controller.getBySlug);

router.post('/', authenticate, validate({ body: schemas.create }), logActivity(ACTIONS.POST_CREATE), controller.create);
router.patch(
  '/:id',
  authenticate,
  validate({ params: idParams, body: schemas.update }),
  logActivity(ACTIONS.POST_UPDATE),
  controller.update
);
router.delete(
  '/:id',
  authenticate,
  validate({ params: idParams }),
  logActivity(ACTIONS.POST_DELETE),
  controller.remove
);

// Comments are a sub-resource of a post for listing and creation.
router.get(
  '/:postId/comments',
  validate({ params: commentSchemas.postParams, query: paginationQuery }),
  commentController.listForPost
);
router.post(
  '/:postId/comments',
  authenticate,
  validate({ params: commentSchemas.postParams, body: commentSchemas.body }),
  logActivity(ACTIONS.COMMENT_CREATE),
  commentController.create
);

module.exports = router;
