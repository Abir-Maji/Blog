import client from './client';

// Every function resolves to the API envelope: { success, message, data, meta? }
const unwrap = (promise) => promise.then((res) => res.data);

export const authApi = {
  register: (body) => unwrap(client.post('/auth/register', body)),
  login: (body) => unwrap(client.post('/auth/login', body)),
  logout: () => unwrap(client.post('/auth/logout')),
};

export const postsApi = {
  list: (params) => unwrap(client.get('/posts', { params })),
  getBySlug: (slug) => unwrap(client.get(`/posts/${slug}`)),
  create: (body) => unwrap(client.post('/posts', body)),
  update: (id, body) => unwrap(client.patch(`/posts/${id}`, body)),
  remove: (id) => unwrap(client.delete(`/posts/${id}`)),
};

export const commentsApi = {
  list: (postId, params) => unwrap(client.get(`/posts/${postId}/comments`, { params })),
  create: (postId, body) => unwrap(client.post(`/posts/${postId}/comments`, body)),
  update: (id, body) => unwrap(client.patch(`/comments/${id}`, body)),
  remove: (id) => unwrap(client.delete(`/comments/${id}`)),
};

export const adminApi = {
  stats: () => unwrap(client.get('/admin/stats')),
  activity: (params) => unwrap(client.get('/admin/activity', { params })),
  users: (params) => unwrap(client.get('/admin/users', { params })),
  updateUser: (id, body) => unwrap(client.patch(`/admin/users/${id}`, body)),
  deleteUser: (id) => unwrap(client.delete(`/admin/users/${id}`)),
  posts: (params) => unwrap(client.get('/admin/posts', { params })),
  restorePost: (id) => unwrap(client.patch(`/admin/posts/${id}/restore`)),
  comments: (params) => unwrap(client.get('/admin/comments', { params })),
};
