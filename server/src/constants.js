const ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user' });

const ACTIONS = Object.freeze({
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  POST_CREATE: 'post.create',
  POST_UPDATE: 'post.update',
  POST_DELETE: 'post.delete',
  POST_RESTORE: 'post.restore',
  COMMENT_CREATE: 'comment.create',
  COMMENT_UPDATE: 'comment.update',
  COMMENT_DELETE: 'comment.delete',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
});

module.exports = { ROLES, ACTIONS };
