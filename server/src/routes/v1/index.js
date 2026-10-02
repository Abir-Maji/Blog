const { Router } = require('express');
const { sendSuccess } = require('../../utils/apiResponse');

const router = Router();

router.get('/health', (req, res) => sendSuccess(res, { message: 'API is healthy', data: { uptime: process.uptime() } }));

router.use('/auth', require('./auth.routes'));
router.use('/posts', require('./post.routes'));
router.use('/comments', require('./comment.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
