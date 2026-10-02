const authService = require('../../src/services/auth.service');
const User = require('../../src/models/User');
const { createUser } = require('../helpers');

const profile = { provider: 'google', providerId: 'g-123', email: 'grace@example.com', name: 'Grace Hopper' };

describe('authService.oauthLogin', () => {
  it('creates a new account for a first-time social login', async () => {
    const session = await authService.oauthLogin(profile);
    const stored = await User.findOne({ googleId: 'g-123' }).select('+password');

    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.user).toMatchObject({ email: 'grace@example.com', provider: 'google', role: 'user' });
    expect(stored.password).toBeUndefined();
  });

  it('reuses the same account on later logins', async () => {
    const first = await authService.oauthLogin(profile);
    const second = await authService.oauthLogin(profile);
    expect(second.user._id).toBe(first.user._id);
    expect(await User.countDocuments()).toBe(1);
  });

  it('links the provider to an existing account with the same email', async () => {
    const { id } = await createUser({ email: profile.email });
    const session = await authService.oauthLogin(profile);

    expect(session.user._id).toBe(id);
    expect((await User.findById(id)).googleId).toBe('g-123');
  });

  it('supports providers that do not share an email', async () => {
    const session = await authService.oauthLogin({ provider: 'facebook', providerId: 'fb-1', name: 'No Email' });
    expect(session.user.email).toBeUndefined();
    expect(session.user.provider).toBe('facebook');
  });

  it('rejects a deactivated account', async () => {
    await createUser({ email: profile.email, isActive: false });
    await expect(authService.oauthLogin(profile)).rejects.toMatchObject({ statusCode: 403 });
  });
});
