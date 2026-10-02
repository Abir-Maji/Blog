const ActivityLog = require('../models/ActivityLog');
const env = require('../config/env');

// Records a user activity once the request has completed successfully:
//   router.post('/', authenticate, logActivity(ACTIONS.POST_CREATE), controller)
// Controllers can set res.locals.actorId (e.g. on login, where req.user is not
// set yet) and res.locals.activityMeta for extra detail.
const logActivity = (action) => (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    // No identified actor means nothing happened (e.g. a failed OAuth redirect).
    if (!req.user && !res.locals.actorId) return;

    const entry = {
      user: req.user?.id || res.locals.actorId,
      action,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      meta: res.locals.activityMeta,
    };

    if (!env.isTest) console.log(`[activity] ${action} user=${entry.user}${req.method} ${req.originalUrl}`);
    // Logging must never break or delay the request.
    ActivityLog.create(entry).catch((err) => {
      if (!env.isTest) console.error('[activity] failed to record activity:', err.message);
    });
  });
  next();
};

module.exports = logActivity;
