import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/posts', label: 'Posts' },
  { to: '/admin/comments', label: 'Comments' },
];

const tabClass = ({ isActive }) =>
  `-mb-px border-b-[3px] py-3 text-[15px] font-medium transition-colors ${
    isActive ? 'border-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
  }`;

export default function AdminLayout() {
  return (
    <div>
      <h1 className="page-title">Admin panel</h1>
      <p className="mt-2 text-slate-500">Manage users, posts and comments across the site.</p>
      <nav className="mt-8 mb-8 flex flex-wrap gap-x-8 border-b border-slate-900" aria-label="Admin sections">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
