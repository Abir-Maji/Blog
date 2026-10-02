const jwt = require('jsonwebtoken');
const tokens = require('../../src/utils/tokens');
const { paginate, buildMeta } = require('../../src/utils/pagination');
const { makeExcerpt } = require('../../src/services/post.service');

const user = { _id: '507f1f77bcf86cd799439011', role: 'user' };

describe('tokens', () => {
  it('signs an access token carrying the user id and role', () => {
    const payload = tokens.verifyAccessToken(tokens.signAccessToken(user));
    expect(payload).toMatchObject({ sub: user._id, role: 'user' });
  });

  it('uses different secrets for access and refresh tokens', () => {
    expect(() => tokens.verifyAccessToken(tokens.signRefreshToken(user))).toThrow();
    expect(() => tokens.verifyRefreshToken(tokens.signAccessToken(user))).toThrow();
  });

  it('issues a unique refresh token every time', () => {
    expect(tokens.signRefreshToken(user)).not.toBe(tokens.signRefreshToken(user));
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ sub: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
    expect(() => tokens.verifyAccessToken(expired)).toThrow(/expired/);
  });

  it('hashes tokens deterministically without storing the token itself', () => {
    const hash = tokens.hashToken('abc');
    expect(hash).toBe(tokens.hashToken('abc'));
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('abc');
  });
});

describe('pagination', () => {
  it('computes skip from page and limit', () => {
    expect(paginate({ page: 3, limit: 10 })).toEqual({ skip: 20, limit: 10 });
  });

  it('builds page metadata', () => {
    expect(buildMeta({ page: 2, limit: 10, total: 25 })).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it('reports a single page when there are no results', () => {
    expect(buildMeta({ page: 1, limit: 10, total: 0 })).toMatchObject({ totalPages: 1, hasNextPage: false });
  });
});

describe('makeExcerpt', () => {
  it('collapses whitespace and keeps short content as is', () => {
    expect(makeExcerpt('Hello\n\n  world')).toBe('Hello world');
  });

  it('truncates long content with an ellipsis', () => {
    const excerpt = makeExcerpt('word '.repeat(100));
    expect(excerpt.length).toBeLessThanOrEqual(201);
    expect(excerpt.endsWith('…')).toBe(true);
  });
});
