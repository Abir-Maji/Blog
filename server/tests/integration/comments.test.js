const { api, createUser, createAdmin, createPost, createComment } = require('../helpers');
const Post = require('../../src/models/Post');
const Comment = require('../../src/models/Comment');
const notifications = require('../../src/services/notification.service');

const commentsUrl = (postId) => `/api/v1/posts/${postId}/comments`;
const commentUrl = (id) => `/api/v1/comments/${id}`;

describe('POST /posts/:postId/comments', () => {
  it('requires authentication', async () => {
    const author = await createUser();
    const post = await createPost(author);
    const res = await api().post(commentsUrl(post._id)).send({ content: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('adds a comment linked to the post and its author', async () => {
    const author = await createUser();
    const reader = await createUser();
    const post = await createPost(author);

    const res = await api().post(commentsUrl(post._id)).set(reader.auth).send({ content: 'Great post!' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      content: 'Great post!',
      post: post._id,
      author: { _id: reader.id, name: reader.user.name },
    });
    const stored = await Post.findById(post._id);
    expect(stored.commentCount).toBe(1);
    // A comment is not an edit of the post.
    expect(stored.updatedAt.toISOString()).toBe(post.updatedAt);
  });

  it('notifies the post author, but not when they comment on their own post', async () => {
    const spy = jest.spyOn(notifications, 'notifyUser').mockImplementation(() => {});
    const author = await createUser();
    const reader = await createUser();
    const post = await createPost(author);

    await createComment(author, post._id);
    expect(spy).not.toHaveBeenCalled();

    await createComment(reader, post._id);
    expect(spy).toHaveBeenCalledWith(author.id, expect.objectContaining({ type: 'comment.created' }));
    spy.mockRestore();
  });

  it('notifies admins of every new comment, except the commenter and the author', async () => {
    const spy = jest.spyOn(notifications, 'notifyAdmins').mockImplementation(() => {});
    const author = await createUser();
    const reader = await createUser();
    const post = await createPost(author);
    spy.mockClear();

    await createComment(reader, post._id);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'comment.created' }), {
      except: [reader.id, author.id],
    });
    spy.mockRestore();
  });

  it('rejects an empty comment and a comment on a deleted post', async () => {
    const author = await createUser();
    const post = await createPost(author);

    expect((await api().post(commentsUrl(post._id)).set(author.auth).send({ content: '   ' })).status).toBe(400);

    await api().delete(`/api/v1/posts/${post._id}`).set(author.auth);
    expect((await api().post(commentsUrl(post._id)).set(author.auth).send({ content: 'Hello' })).status).toBe(404);
  });
});

describe('GET /posts/:postId/comments', () => {
  it('returns the comments of that post only, paginated, with author names', async () => {
    const author = await createUser();
    const post = await createPost(author);
    const otherPost = await createPost(author, { title: 'Another post' });
    for (let i = 1; i <= 3; i += 1) await createComment(author, post._id, `Comment ${i}`);
    await createComment(author, otherPost._id, 'Elsewhere');

    const res = await api().get(`${commentsUrl(post._id)}?limit=2`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.content)).toEqual(['Comment 3', 'Comment 2']);
    expect(res.body.data[0].author.name).toBe(author.user.name);
    expect(res.body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });
});

describe('PATCH /comments/:id', () => {
  it('lets the author edit their comment', async () => {
    const user = await createUser();
    const post = await createPost(user);
    const comment = await createComment(user, post._id);

    const res = await api().patch(commentUrl(comment._id)).set(user.auth).send({ content: 'Edited' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('Edited');
  });

  it('forbids another user, including the author of the post', async () => {
    const postAuthor = await createUser();
    const commenter = await createUser();
    const post = await createPost(postAuthor);
    const comment = await createComment(commenter, post._id);

    const res = await api().patch(commentUrl(comment._id)).set(postAuthor.auth).send({ content: 'Edited' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /comments/:id', () => {
  it('lets the author delete their comment and updates the count', async () => {
    const user = await createUser();
    const post = await createPost(user);
    const comment = await createComment(user, post._id);

    await api().delete(commentUrl(comment._id)).set(user.auth).expect(200);

    expect(await Comment.findById(comment._id)).toBeNull();
    expect((await Post.findById(post._id)).commentCount).toBe(0);
  });

  it('forbids another regular user but allows an admin', async () => {
    const user = await createUser();
    const other = await createUser();
    const admin = await createAdmin();
    const post = await createPost(user);
    const comment = await createComment(user, post._id);

    expect((await api().delete(commentUrl(comment._id)).set(other.auth)).status).toBe(403);
    expect((await api().delete(commentUrl(comment._id)).set(admin.auth)).status).toBe(200);
  });

  it('returns 404 for an unknown comment', async () => {
    const user = await createUser();
    const res = await api().delete(commentUrl('507f1f77bcf86cd799439011')).set(user.auth);
    expect(res.status).toBe(404);
  });
});
