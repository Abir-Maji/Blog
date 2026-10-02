const { Router } = require('express');
const controller = require('../../controllers/comment.controller');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const logActivity = require('../../middleware/activityLogger');
const schemas = require('../../validators/comment.validator');
const { idParams } = require('../../validators/common');
const { ACTIONS } = require('../../constants');

const router = Router();

router.use(authenticate);

router.patch(
  '/:id',
  validate({ params: idParams, body: schemas.body }),
  logActivity(ACTIONS.COMMENT_UPDATE),
  controller.update
);
router.delete('/:id', validate({ params: idParams }), logActivity(ACTIONS.COMMENT_DELETE), controller.remove);

module.exports = router;
