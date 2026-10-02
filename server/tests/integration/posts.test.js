const { api, createUser, createAdmin, createPost } = require('../helpers');
const Post = require('../../src/models/Post');

const BASE = '/api/v1/posts';
const body = { title: 'Hello MERN World', content: 'This is the content of the post.' };

describe('POST /posts', () => {
  it('requires authentication', async () => {
    const res = await api().post(BASE).send(body);
    expect(res.status).toBe(401);
  });

  it('creates a post with a slug, an author and timestamps', async () => {
    const author = await createUser();
    const res = await api().post(BASE).set(author.auth).send(body);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: body.title,
      slug: 'hello-mern-world',
      content: body.content,
      author: { _id: author.id, name: author.user.name },
    });
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();
  });

  it('generates a different slug when the title is already used', async () => {
    const author = await createUser();
    const first = await createPost(author, body);
    const second = await createPost(author, body);

    expect(first.slug).toBe('hello-mern-world');
    expect(second.slug).toMatch(/^hello-mern-world-[0-9a-f]{6}$/);
  });

  it('validates the payload', async () => {
    const author = await createUser();
    const res = await api().post(BASE).set(author.auth).send({ title: 'Hi', content: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['title', 'content']));
  });

  it('always uses the authenticated user as the author', async () => {
    const author = await createUser();
    const other = await createUser();
    const res = await api().post(BASE).set(author.auth).send({ ...body, author: other.id });
    expect(res.body.data.author._id).toBe(author.id);
  });
});

describe('GET /posts', () => {
  it('returns a paginated list, newest first, without the full content', async () => {
    const author = await createUser();
    for (let i = 1; i <= 12; i += 1) await createPost(author, { title: `Post number ${i}` });

    const res = await api().get(`${BASE}?page=2&limit=5`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 5, total: 12, totalPages: 3, hasNextPage: true });
    expect(res.body.data[0].title).toBe('Post number 7');
    expect(res.body.data[0].content).toBeUndefined();
    expect(res.body.data[0].excerpt).toBeDefined();
    expect(res.body.data[0].author.name).toBe(author.user.name);
  });

  it('filters by author and by search text', async () => {
    const alice = await createUser();
    const bob = await createUser();
    await createPost(alice, { title: 'Learning MongoDB indexes' });
    await createPost(bob, { title: 'React hooks in depth' });

    const byAuthor = await api().get(`${BASE}?author=${bob.id}`);
    expect(byAuthor.body.data.map((p) => p.title)).toEqual(['React hooks in depth']);

    const bySearch = await api().get(`${BASE}?search=mongodb`);
    expect(bySearch.body.data.map((p) => p.title)).toEqual(['Learning MongoDB indexes']);
  });

  it('rejects an invalid page size', async () => {
    const res = await api().get(`${BASE}?limit=500`);
    expect(res.status).toBe(400);
  });
});

describe('GET /posts/:slug', () => {
  it('returns the full post by slug', async () => {
    const author = await createUser();
    const post = await createPost(author, body);

    const res = await api().get(`${BASE}/${post.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: body.title, content: body.content });
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await api().get(`${BASE}/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: 'Post not found' });
  });
});

describe('PATCH /posts/:id', () => {
  it('lets the author update their post and keeps the slug', async () => {
    const author = await createUser();
    const post = await createPost(author, body);

    const res = await api().patch(`${BASE}/${post._id}`).set(author.auth).send({ title: 'A new title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('A new title');
    expect(res.body.data.slug).toBe(post.slug);
  });

  it('forbids another regular user', async () => {
    const author = await createUser();
    const other = await createUser();
    const post = await createPost(author, body);

    const res = await api().patch(`${BASE}/${post._id}`).set(other.auth).send({ title: 'Hijacked title' });

    expect(res.status).toBe(403);
    expect((await Post.findById(post._id)).title).toBe(body.title);
  });

  it('lets an admin update any post', async () => {
    const author = await createUser();
    const admin = await createAdmin();
    const post = await createPost(author, body);

    const res = await api().patch(`${BASE}/${post._id}`).set(admin.auth).send({ title: 'Edited by admin' });
    expect(res.status).toBe(200);
  });

  it('rejects an empty update and an invalid id', async () => {
    const author = await createUser();
    const post = await createPost(author, body);

    expect((await api().patch(`${BASE}/${post._id}`).set(author.auth).send({})).status).toBe(400);
    expect((await api().patch(`${BASE}/not-an-id`).set(author.auth).send({ title: 'Valid title' })).status).toBe(400);
  });
});

describe('DELETE /posts/:id', () => {
  it('soft-deletes the post: hidden from the API but kept in the database', async () => {
    const author = await createUser();
    const post = await createPost(author, body);

    await api().delete(`${BASE}/${post._id}`).set(author.auth).expect(200);

    const stored = await Post.findById(post._id);
    expect(stored.isDeleted).toBe(true);
    expect(stored.deletedAt).toBeInstanceOf(Date);

    expect((await api().get(`${BASE}/${post.slug}`)).status).toBe(404);
    expect((await api().get(BASE)).body.data).toHaveLength(0);
    expect((await api().delete(`${BASE}/${post._id}`).set(author.auth)).status).toBe(404);
  });

  it('forbids another regular user but allows an admin', async () => {
    const author = await createUser();
    const other = await createUser();
    const admin = await createAdmin();
    const post = await createPost(author, body);

    expect((await api().delete(`${BASE}/${post._id}`).set(other.auth)).status).toBe(403);
    expect((await api().delete(`${BASE}/${post._id}`).set(admin.auth)).status).toBe(200);
  });
});
