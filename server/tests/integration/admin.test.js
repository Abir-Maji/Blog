const { api, createUser, createAdmin, createPost, createComment } = require('../helpers');
const User = require('../../src/models/User');
const Post = require('../../src/models/Post');
const Comment = require('../../src/models/Comment');

const BASE = '/api/v1/admin';

describe('admin access control', () => {
  it('rejects unauthenticated requests with 401', async () => {
    expect((await api().get(`${BASE}/stats`)).status).toBe(401);
  });

  it('rejects regular users with 403 on every admin route', async () => {
    const user = await createUser();
    for (const path of ['/stats', '/users', '/posts', '/comments', '/activity']) {
      const res = await api().get(`${BASE}${path}`).set(user.auth);
      expect(res.status).toBe(403);
    }
  });

  it('applies a role change immediately, even to an existing token', async () => {
    const admin = await createAdmin();
    await User.updateOne({ _id: admin.id }, { role: 'user' });
    expect((await api().get(`${BASE}/stats`).set(admin.auth)).status).toBe(403);
  });
});

describe('GET /admin/stats', () => {
  it('returns totals for users, posts and comments', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const kept = await createPost(user);
    const removed = await createPost(user, { title: 'To be removed' });
    await createComment(user, kept._id);
    await createComment(admin, kept._id);
    await api().delete(`/api/v1/posts/${removed._id}`).set(user.auth);

    const res = await api().get(`${BASE}/stats`).set(admin.auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ totalUsers: 2, totalPosts: 1, deletedPosts: 1, totalComments: 2 });
  });
});

describe('admin user management', () => {
  it('lists users with pagination and search, without sensitive fields', async () => {
    const admin = await createAdmin();
    await createUser({ name: 'Findable Person' });
    await createUser();

    const all = await api().get(`${BASE}/users?limit=2`).set(admin.auth);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta.total).toBe(3);
    expect(all.body.data[0].password).toBeUndefined();
    expect(all.body.data[0].refreshTokens).toBeUndefined();

    const found = await api().get(`${BASE}/users?search=findable`).set(admin.auth);
    expect(found.body.data.map((u) => u.name)).toEqual(['Findable Person']);
  });

  it('changes a user role', async () => {
    const admin = await createAdmin();
    const user = await createUser();

    const res = await api().patch(`${BASE}/users/${user.id}`).set(admin.auth).send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('admin');
    expect((await api().get(`${BASE}/stats`).set(user.auth)).status).toBe(200);
  });

  it('deactivates a user, which blocks their existing token', async () => {
    const admin = await createAdmin();
    const user = await createUser();

    await api().patch(`${BASE}/users/${user.id}`).set(admin.auth).send({ isActive: false }).expect(200);

    expect((await api().get('/api/v1/auth/me').set(user.auth)).status).toBe(403);
  });

  it('does not let admins change or delete their own account', async () => {
    const admin = await createAdmin();
    expect((await api().patch(`${BASE}/users/${admin.id}`).set(admin.auth).send({ role: 'user' })).status).toBe(400);
    expect((await api().delete(`${BASE}/users/${admin.id}`).set(admin.auth)).status).toBe(400);
  });

  it('rejects an invalid role', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const res = await api().patch(`${BASE}/users/${user.id}`).set(admin.auth).send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });

  it('deletes a user, soft-deletes their posts and removes their comments', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const adminPost = await createPost(admin, { title: 'Admin post' });
    const userPost = await createPost(user, { title: 'User post' });
    await createComment(user, adminPost._id);

    await api().delete(`${BASE}/users/${user.id}`).set(admin.auth).expect(200);

    expect(await User.findById(user.id)).toBeNull();
    expect((await Post.findById(userPost._id)).isDeleted).toBe(true);
    expect(await Comment.countDocuments({ author: user.id })).toBe(0);
    expect((await Post.findById(adminPost._id)).commentCount).toBe(0);
  });
});

describe('admin post management', () => {
  it('lists posts including soft-deleted ones and filters by status', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await createPost(user, { title: 'Active post' });
    const removed = await createPost(user, { title: 'Removed post' });
    await api().delete(`/api/v1/posts/${removed._id}`).set(user.auth);

    const all = await api().get(`${BASE}/posts`).set(admin.auth);
    expect(all.body.data).toHaveLength(2);

    const deleted = await api().get(`${BASE}/posts?status=deleted`).set(admin.auth);
    expect(deleted.body.data.map((p) => p.title)).toEqual(['Removed post']);
  });

  it('restores a soft-deleted post', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const post = await createPost(user);
    await api().delete(`/api/v1/posts/${post._id}`).set(user.auth);

    const res = await api().patch(`${BASE}/posts/${post._id}/restore`).set(admin.auth);

    expect(res.status).toBe(200);
    expect(res.body.data.isDeleted).toBe(false);
    expect((await api().get(`/api/v1/posts/${post.slug}`)).status).toBe(200);
  });
});

describe('GET /admin/comments', () => {
  it('lists all comments with their post and author', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const post = await createPost(user, { title: 'Commented post' });
    await createComment(user, post._id, 'First!');

    const res = await api().get(`${BASE}/comments`).set(admin.auth);

    expect(res.body.data[0]).toMatchObject({
      content: 'First!',
      author: { name: user.user.name },
      post: { title: 'Commented post', slug: post.slug },
    });
  });
});

describe('unknown routes', () => {
  it('returns a consistent 404 error', async () => {
    const res = await api().get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
