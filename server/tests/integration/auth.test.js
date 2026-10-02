const request = require('supertest');
const { app, api, PASSWORD, createUser } = require('../helpers');
const User = require('../../src/models/User');
const ActivityLog = require('../../src/models/ActivityLog');

const BASE = '/api/v1/auth';
const credentials = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Password123' };

const refreshCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));

describe('POST /auth/register', () => {
  it('creates an account and returns an access token and a refresh cookie', async () => {
    const res = await api().post(`${BASE}/register`).send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', role: 'user' });
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(refreshCookie(res)).toMatch(/HttpOnly/);
  });

  it('stores the password hashed and never returns it', async () => {
    const res = await api().post(`${BASE}/register`).send(credentials);
    const stored = await User.findOne({ email: credentials.email }).select('+password');

    expect(stored.password).not.toBe(credentials.password);
    expect(stored.password).toMatch(/^\$2/);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await api().post(`${BASE}/register`).send(credentials);
    const res = await api().post(`${BASE}/register`).send(credentials);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid input with field-level errors', async () => {
    const res = await api().post(`${BASE}/register`).send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('ignores a role sent by the client', async () => {
    const res = await api().post(`${BASE}/register`).send({ ...credentials, role: 'admin' });
    expect(res.body.data.user.role).toBe('user');
  });
});

describe('POST /auth/login', () => {
  it('logs in with valid credentials and records the activity', async () => {
    const { user } = await createUser();
    const res = await api().post(`${BASE}/login`).send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toBeDefined();

    // The activity log is written after the response has been sent.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const log = await ActivityLog.findOne({ action: 'auth.login' });
    expect(String(log.user)).toBe(String(user._id));
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    const { user } = await createUser();
    const wrong = await api().post(`${BASE}/login`).send({ email: user.email, password: 'WrongPass1' });
    const unknown = await api().post(`${BASE}/login`).send({ email: 'nobody@example.com', password: PASSWORD });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('rejects a deactivated account', async () => {
    const { user } = await createUser({ isActive: false });
    const res = await api().post(`${BASE}/login`).send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe('GET /auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const { user, auth } = await createUser();
    const res = await api().get(`${BASE}/me`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('rejects a missing or malformed token', async () => {
    expect((await api().get(`${BASE}/me`)).status).toBe(401);
    expect((await api().get(`${BASE}/me`).set('Authorization', 'Bearer not-a-token')).status).toBe(401);
  });
});

describe('refresh token flow', () => {
  it('issues a new access token and rotates the refresh token', async () => {
    const agent = request.agent(app);
    const registered = await agent.post(`${BASE}/register`).send(credentials);

    const res = await agent.post(`${BASE}/refresh`);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toBeDefined();
    expect(refreshCookie(res)).not.toBe(refreshCookie(registered));
  });

  it('rejects a refresh token that was already used and revokes all sessions', async () => {
    const agent = request.agent(app);
    const registered = await agent.post(`${BASE}/register`).send(credentials);
    const oldCookie = refreshCookie(registered).split(';')[0];

    await agent.post(`${BASE}/refresh`).expect(200);
    const reused = await api().post(`${BASE}/refresh`).set('Cookie', oldCookie);
    expect(reused.status).toBe(401);

    // The rotated token is revoked as well.
    await agent.post(`${BASE}/refresh`).expect(401);
  });

  it('rejects a request without a refresh cookie', async () => {
    const res = await api().post(`${BASE}/refresh`);
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token', async () => {
    const agent = request.agent(app);
    const registered = await agent.post(`${BASE}/register`).send(credentials);
    const cookie = refreshCookie(registered).split(';')[0];

    await agent.post(`${BASE}/logout`).expect(200);

    const res = await api().post(`${BASE}/refresh`).set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('social login', () => {
  it('redirects back to the client when a provider is not configured', async () => {
    const res = await api().get(`${BASE}/google`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login\?error=provider_not_configured$/);
  });
});
