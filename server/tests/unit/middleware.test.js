const express = require('express');
const request = require('supertest');
const { z } = require('zod');
const authorize = require('../../src/middleware/authorize');
const validate = require('../../src/middleware/validate');
const { createRateLimiter } = require('../../src/middleware/rateLimiter');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { assertOwnerOrAdmin } = require('../../src/utils/permissions');
const ApiError = require('../../src/utils/ApiError');

describe('authorize middleware', () => {
  const run = (user, ...roles) => {
    const next = jest.fn();
    authorize(...roles)({ user }, {}, next);
    return next.mock.calls[0][0];
  };

  it('allows a user with an allowed role', () => {
    expect(run({ role: 'admin' }, 'admin')).toBeUndefined();
  });

  it('rejects a user with a different role with 403', () => {
    expect(run({ role: 'user' }, 'admin')).toMatchObject({ statusCode: 403 });
  });

  it('rejects an unauthenticated request with 401', () => {
    expect(run(undefined, 'admin')).toMatchObject({ statusCode: 401 });
  });
});

describe('assertOwnerOrAdmin', () => {
  it('allows the owner', () => {
    expect(() => assertOwnerOrAdmin({ id: 'a', role: 'user' }, 'a')).not.toThrow();
  });

  it('allows an admin who is not the owner', () => {
    expect(() => assertOwnerOrAdmin({ id: 'b', role: 'admin' }, 'a')).not.toThrow();
  });

  it('rejects another regular user', () => {
    expect(() => assertOwnerOrAdmin({ id: 'b', role: 'user' }, 'a')).toThrow(ApiError);
  });
});

describe('validate middleware', () => {
  const schema = { body: z.object({ title: z.string().min(3), views: z.coerce.number().default(0) }) };

  it('exposes parsed values on req.validated', () => {
    const req = { body: { title: 'Hello', extra: 'dropped' } };
    const next = jest.fn();
    validate(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.validated.body).toEqual({ title: 'Hello', views: 0 });
  });

  it('passes a 400 error listing each invalid field', () => {
    const next = jest.fn();
    validate(schema)({ body: { title: 'x' } }, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.errors).toEqual([expect.objectContaining({ field: 'title' })]);
  });
});

describe('rate limiter', () => {
  it('responds with 429 once the limit is exceeded', async () => {
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, max: 2, message: 'Slow down' }));
    app.get('/', (req, res) => res.json({ ok: true }));

    await request(app).get('/').expect(200);
    await request(app).get('/').expect(200);
    const res = await request(app).get('/').expect(429);
    expect(res.body).toEqual({ success: false, message: 'Slow down' });
  });
});

describe('error handler', () => {
  const appWith = (err) => {
    const app = express();
    app.get('/', () => {
      throw err;
    });
    app.use(errorHandler);
    return app;
  };

  it('formats ApiError consistently', async () => {
    const res = await request(appWith(ApiError.badRequest('Nope', [{ field: 'a', message: 'bad' }]))).get('/');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Nope', errors: [{ field: 'a', message: 'bad' }] });
  });

  it('maps duplicate key errors to 409', async () => {
    const res = await request(appWith(Object.assign(new Error('dup'), { code: 11000, keyPattern: { email: 1 } }))).get('/');
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/);
  });

  it('hides details of unexpected errors behind a 500', async () => {
    const res = await request(appWith(new Error('secret detail'))).get('/');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Internal server error');
  });
});
