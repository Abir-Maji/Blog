import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, commentsApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import { useNotifications } from '../../context/NotificationContext';
import { useFetch } from '../../hooks/useFetch';
import { ErrorMessage, Pagination, Spinner } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

export default function Comments() {
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);

  const { data: comments, meta, loading, error, reload } = useFetch(
    () => adminApi.comments({ page, limit: 10 }),
    [page]
  );

  const remove = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(comment._id);
      toast('Comment deleted', 'success');
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <section className="card">
      <h2 className="mb-4 text-lg font-semibold">Comments{meta ? ` (${meta.total})` : ''}</h2>

      <ErrorMessage>{error}</ErrorMessage>
      {loading && !comments && <Spinner />}
      {comments?.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}

      {comments?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Comment</th>
                <th>Author</th>
                <th>Post</th>
                <th>Posted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr key={comment._id}>
                  <td className="max-w-xs truncate">{comment.content}</td>
                  <td className="text-slate-500">{comment.author?.name || 'Deleted user'}</td>
                  <td>
                    {comment.post && !comment.post.isDeleted ? (
                      <Link to={`/posts/${comment.post.slug}`} className="hover:text-indigo-600">
                        {comment.post.title}
                      </Link>
                    ) : (
                      <span className="text-slate-400">{comment.post?.title || 'Deleted post'}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{formatDateTime(comment.createdAt)}</td>
                  <td>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(comment)}>
                      Delete
                    </button>
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
