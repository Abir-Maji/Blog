import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage, Spinner } from '../components/ui';

const oauthErrors = {
  oauth_failed: 'Social login failed. Please try again.',
  provider_not_configured: 'This social login is not configured on the server.',
  account_deactivated: 'This account has been deactivated.',
};

// Social login is a full-page redirect to the API, which redirects to the provider.
function SocialButtons() {
  return (
    <div className="space-y-2">
      <a href={`${API_URL}/auth/google`} className="btn w-full bg-white">
        Continue with Google
      </a>
      <a href={`${API_URL}/auth/facebook`} className="btn w-full bg-white">
        Continue with Facebook
      </a>
    </div>
  );
}

function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(oauthErrors[params.get('error')] || null);
  const [submitting, setSubmitting] = useState(false);

  // Return to the page the user was sent here from, if any.
  const redirectTo = location.state?.from || '/';

  if (loading) return <Spinner />;
  if (user) return <Navigate to={redirectTo} replace />;

  const handleChange = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up mt-4 grid overflow-hidden rounded-md border border-slate-900 lg:grid-cols-2">
      <div className="hidden flex-col justify-between gap-12 bg-slate-900 p-12 text-slate-50 lg:flex">
        <span className="font-display text-3xl leading-none">Inkwell</span>
        <p className="font-display text-7xl leading-none text-balance">
          Write something <em className="text-indigo-300">worth reading.</em>
        </p>
        <span className="font-mono text-xs tracking-widest text-slate-300 uppercase">Posts · Comments · Community</span>
      </div>

      <div className="mx-auto w-full max-w-md space-y-6 bg-slate-50 px-6 py-12 sm:px-8">
        <div>
          <h1 className="page-title text-[2.75rem]">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-slate-500">
            {isRegister ? 'Join and start writing in a minute.' : 'Log in to write, comment and manage your posts.'}
          </p>
        </div>
        <ErrorMessage>{error}</ErrorMessage>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" className="input" value={form.name} onChange={handleChange} minLength={2} autoComplete="name" required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" value={form.email} onChange={handleChange} autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleChange}
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
            {isRegister && <p className="mt-1 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>}
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <div className="meta flex items-center gap-3 tracking-widest uppercase">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <SocialButtons />

        <p className="text-[15px] text-slate-500">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <Link to={isRegister ? '/login' : '/register'} state={location.state} className="font-medium text-indigo-600 hover:underline">
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}

export const Login = () => <AuthForm key="login" mode="login" />;
export const Register = () => <AuthForm key="register" mode="register" />;

// Landing page after social login. The API has set the refresh cookie; the auth
// context exchanges it for a session on load, so this page only waits for that.
export function OAuthCallback() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Signing you in…" />;
  return <Navigate to={user ? '/' : '/login?error=oauth_failed'} replace />;
}
