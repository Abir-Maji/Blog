import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Avatar } from './ui';
import { formatDateTime } from '../utils/format';

const linkClass = ({ isActive }) =>
  `border-b-2 py-1 text-[15px] font-medium transition-colors ${
    isActive ? 'border-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
  }`;

function NotificationBell() {
  const { notifications, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((value) => !value);
    markAllRead();
  };

  return (
    <div className="relative">
      <button type="button" className="relative cursor-pointer rounded-md p-2.5 hover:bg-slate-200" onClick={toggle} aria-label="Notifications">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 font-mono text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-up absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-md border border-slate-900 bg-white">
          <div className="border-b border-slate-900 px-4 py-2.5 font-mono text-xs tracking-widest uppercase">Notifications</div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing new yet</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n, index) => (
                <li key={`${n.createdAt}-${index}`} className="border-b border-slate-100 last:border-0">
                  <Link to={n.link || '/'} className="block px-4 py-3 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
                    {n.message}
                    <span className="meta mt-1 block">{formatDateTime(n.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-50">
      <div className="mx-auto flex h-17 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-6 sm:gap-10">
          <Link to="/" className="font-display text-3xl leading-none">
            Inkwell
          </Link>
          <nav className="flex items-center gap-5 sm:gap-7">
            <NavLink to="/" end className={linkClass}>
              Posts
            </NavLink>
            {user && (
              <NavLink to="/my-posts" className={linkClass}>
                My posts
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/posts/new" className="btn btn-primary btn-sm">
                New post
              </Link>
              <NotificationBell />
              <span className="hidden items-center gap-2 text-sm font-medium md:flex">
                <Avatar name={user.name} size="sm" />
                {user.name}
                {isAdmin && <span className="badge border border-indigo-600 text-indigo-600 uppercase">admin</span>}
              </span>
              <button type="button" className="btn btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
