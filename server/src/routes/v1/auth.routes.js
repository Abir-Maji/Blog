const { Router } = require('express');
const controller = require('../../controllers/auth.controller');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const logActivity = require('../../middleware/activityLogger');
const { authLimiter, sessionLimiter } = require('../../middleware/rateLimiter');
const schemas = require('../../validators/auth.validator');
const { ACTIONS } = require('../../constants');

const router = Router();

router.get('/me', authenticate, controller.me);
router.get('/providers', controller.providers);

router.post('/refresh', sessionLimiter, controller.refresh);
router.post('/logout', sessionLimiter, logActivity(ACTIONS.LOGOUT), controller.logout);

// Everything below accepts credentials from anyone, so it is strictly rate limited.
router.use(authLimiter);

router.post('/register', validate({ body: schemas.register }), logActivity(ACTIONS.REGISTER), controller.register);
router.post('/login', validate({ body: schemas.login }), logActivity(ACTIONS.LOGIN), controller.login);

router.get('/google', controller.oauthStart('google', ['profile', 'email']));
router.get('/google/callback', logActivity(ACTIONS.LOGIN), controller.oauthCallback('google'));
router.get('/facebook', controller.oauthStart('facebook', ['email']));
router.get('/facebook/callback', logActivity(ACTIONS.LOGIN), controller.oauthCallback('facebook'));

module.exports = router;
