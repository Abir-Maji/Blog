import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

// Guards nested routes. Without `roles` any signed-in user may enter; with
// `roles` the user must also have one of them. The API enforces the same rules,
// so this only decides what the UI shows.
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card mx-auto mt-10 max-w-md text-center">
        <h1 className="text-lg font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">You do not have permission to view this page.</p>
        <Link to="/" className="btn btn-primary mt-4">
          Back to home
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
