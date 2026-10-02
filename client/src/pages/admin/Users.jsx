import { useState } from 'react';
import { adminApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useFetch } from '../../hooks/useFetch';
import { ErrorMessage, Pagination, Spinner } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: users, meta, loading, error, reload } = useFetch(
    () => adminApi.users({ page, limit: 10, search: search || undefined }),
    [page, search]
  );

  // Runs an admin action, then refreshes the list or reports the error.
  const run = async (action, successMessage) => {
    try {
      await action();
      toast(successMessage, 'success');
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const changeRole = (user, role) => run(() => adminApi.updateUser(user._id, { role }), `${user.name} is now ${role}`);

  const toggleActive = (user) =>
    run(
      () => adminApi.updateUser(user._id, { isActive: !user.isActive }),
      `${user.name} ${user.isActive ? 'deactivated' : 'activated'}`
    );

  const remove = (user) => {
    if (!window.confirm(`Delete ${user.name}? Their posts will be soft-deleted and their comments removed.`)) return;
    run(() => adminApi.deleteUser(user._id), `${user.name} deleted`);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Users{meta ? ` (${meta.total})` : ''}</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input className="input w-56" placeholder="Search name or email…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search users" />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
      </div>

      <ErrorMessage>{error}</ErrorMessage>
      {loading && !users && <Spinner />}
      {users?.length === 0 && <p className="text-sm text-slate-500">No users found.</p>}

      {users?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Sign-in</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user._id === currentUser._id;
                return (
                  <tr key={user._id}>
                    <td className="font-medium">
                      {user.name}
                      {isSelf && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="text-slate-500">{user.email || '—'}</td>
                    <td className="text-slate-500">{user.provider}</td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(user.createdAt)}</td>
                    <td>
                      <select
                        className="input w-24 py-1"
                        value={user.role}
                        disabled={isSelf}
                        onChange={(e) => changeRole(user, e.target.value)}
                        aria-label={`Role of ${user.name}`}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {user.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-sm" disabled={isSelf} onClick={() => toggleActive(user)}>
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" disabled={isSelf} onClick={() => remove(user)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </section>
  );
}
