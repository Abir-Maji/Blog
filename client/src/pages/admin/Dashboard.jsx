import { adminApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { ErrorMessage, Spinner } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

function StatCard({ label, value, hint, warn }) {
  return (
    <div className="flex flex-col gap-2.5 border-slate-200 p-7 max-sm:border-b max-sm:last:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="meta tracking-widest uppercase">{label}</p>
      <p className="font-display text-7xl leading-none">{value}</p>
      <p className={`text-sm ${warn ? 'text-orange-800' : 'text-slate-500'}`}>{hint}</p>
    </div>
  );
}

export default function Dashboard() {
  const stats = useFetch(() => adminApi.stats(), []);
  const activity = useFetch(() => adminApi.activity({ limit: 10 }), []);

  return (
    <div className="space-y-6">
      <ErrorMessage>{stats.error}</ErrorMessage>
      {stats.loading && <Spinner />}
      {stats.data && (
        <div className="animate-fade-up grid rounded-md border border-slate-900 bg-white sm:grid-cols-3">
          <StatCard label="Total users" value={stats.data.totalUsers} hint="registered accounts" />
          <StatCard
            label="Total posts"
            value={stats.data.totalPosts}
            hint={`${stats.data.deletedPosts} soft-deleted`}
            warn={stats.data.deletedPosts > 0}
          />
          <StatCard label="Total comments" value={stats.data.totalComments} hint="across all posts" />
        </div>
      )}

      <section>
        <h2 className="mb-2 border-t border-slate-900 py-3 font-mono text-xs tracking-widest uppercase">Recent activity</h2>
        <ErrorMessage>{activity.error}</ErrorMessage>
        {activity.loading && <Spinner />}
        {activity.data?.length === 0 && <p className="text-sm text-slate-500">No activity recorded yet.</p>}
        {activity.data?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {activity.data.map((entry) => (
                  <tr key={entry._id}>
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(entry.createdAt)}</td>
                    <td>{entry.user?.name || 'Deleted user'}</td>
                    <td>
                      <span className="badge border border-slate-200 bg-slate-50">{entry.action}</span>
                    </td>
                    <td className="text-slate-500">{entry.meta?.title || entry.meta?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
