const { Router } = require('express');
const controller = require('../../controllers/admin.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const logActivity = require('../../middleware/activityLogger');
const userSchemas = require('../../validators/user.validator');
const postSchemas = require('../../validators/post.validator');
const { idParams, paginationQuery } = require('../../validators/common');
const { ROLES, ACTIONS } = require('../../constants');

const router = Router();

// Every admin route requires a valid token and the admin role.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', controller.stats);
router.get('/activity', validate({ query: paginationQuery }), controller.activity);

router.get('/users', validate({ query: userSchemas.listQuery }), controller.listUsers);
router.patch(
  '/users/:id',
  validate({ params: idParams, body: userSchemas.update }),
  logActivity(ACTIONS.USER_UPDATE),
  controller.updateUser
);
router.delete('/users/:id', validate({ params: idParams }), logActivity(ACTIONS.USER_DELETE), controller.deleteUser);

router.get('/posts', validate({ query: postSchemas.adminListQuery }), controller.listPosts);
router.patch(
  '/posts/:id/restore',
  validate({ params: idParams }),
  logActivity(ACTIONS.POST_RESTORE),
  controller.restorePost
);

router.get('/comments', validate({ query: paginationQuery }), controller.listComments);

module.exports = router;
