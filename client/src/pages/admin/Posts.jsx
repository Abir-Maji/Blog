import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, postsApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import { useNotifications } from '../../context/NotificationContext';
import { useFetch } from '../../hooks/useFetch';
import { ErrorMessage, Pagination, Spinner } from '../../components/ui';
import { formatDate } from '../../utils/format';

const statuses = ['all', 'active', 'deleted'];

export default function Posts() {
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  const { data: posts, meta, loading, error, reload } = useFetch(
    () => adminApi.posts({ page, limit: 10, status }),
    [page, status]
  );

  const run = async (action, successMessage) => {
    try {
      await action();
      toast(successMessage, 'success');
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const remove = (post) => {
    if (!window.confirm(`Delete "${post.title}"? It can be restored later.`)) return;
    run(() => postsApi.remove(post._id), 'Post deleted');
  };

  const restore = (post) => run(() => adminApi.restorePost(post._id), 'Post restored');

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Posts{meta ? ` (${meta.total})` : ''}</h2>
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {statuses.map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm capitalize ${status === value ? 'btn-primary' : ''}`}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage>{error}</ErrorMessage>
      {loading && !posts && <Spinner />}
      {posts?.length === 0 && <p className="text-sm text-slate-500">No posts found.</p>}

      {posts?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Created</th>
                <th>Comments</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td className="font-medium">
                    {post.isDeleted ? (
                      <span className="text-slate-400 line-through">{post.title}</span>
                    ) : (
                      <Link to={`/posts/${post.slug}`} className="hover:text-indigo-600">
                        {post.title}
                      </Link>
                    )}
                  </td>
                  <td className="text-slate-500">{post.author?.name || 'Deleted user'}</td>
                  <td className="whitespace-nowrap text-slate-500">{formatDate(post.createdAt)}</td>
                  <td className="text-slate-500">{post.commentCount}</td>
                  <td>
                    <span className={`badge ${post.isDeleted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {post.isDeleted ? 'deleted' : 'active'}
                    </span>
                  </td>
                  <td>
                    {post.isDeleted ? (
                      <button type="button" className="btn btn-sm" onClick={() => restore(post)}>
                        Restore
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Link to={`/posts/${post.slug}/edit`} className="btn btn-sm">
                          Edit
                        </Link>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(post)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </section>
  );
}
