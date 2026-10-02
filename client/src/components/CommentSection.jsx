import { useState } from 'react';
import { Link } from 'react-router-dom';
import { commentsApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useFetch } from '../hooks/useFetch';
import { Avatar, ErrorMessage, Pagination, Spinner } from './ui';
import { formatDateTime } from '../utils/format';

const PAGE_SIZE = 10;

function Comment({ comment, onChanged }) {
  const { user, isAdmin } = useAuth();
  const { toast } = useNotifications();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  // Mirrors the API rule: authors manage their own comments, admins manage all.
  const canManage = user && (isAdmin || comment.author?._id === user._id);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await commentsApi.update(comment._id, { content });
      setEditing(false);
      onChanged();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(comment._id);
      onChanged();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <li className="border-t border-slate-200 py-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm">
          <Avatar name={comment.author?.name || 'Deleted user'} size="sm" />
          <span className="text-[15px] font-semibold">{comment.author?.name || 'Deleted user'}</span>
          <span className="meta">
            {formatDateTime(comment.createdAt)}
            {comment.updatedAt !== comment.createdAt && ' (edited)'}
          </span>
        </p>
        {canManage && !editing && (
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={remove}>
              Delete
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-2 space-y-2">
          <textarea className="input" rows={3} value={content} maxLength={2000} onChange={(e) => setContent(e.target.value)} required />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !content.trim()}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setEditing(false);
                setContent(comment.content);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 pl-10 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
      )}
    </li>
  );
}

export default function CommentSection({ postId }) {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments, meta, loading, error, reload } = useFetch(
    () => commentsApi.list(postId, { page, limit: PAGE_SIZE }),
    [postId, page]
  );

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await commentsApi.create(postId, { content });
      setContent('');
      // New comments appear first, so go back to the first page.
      if (page === 1) reload();
      else setPage(1);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-16">
      <div className="eyebrow">
        <h2>Comments</h2>
        {meta && <span className="text-slate-500">{meta.total}</span>}
      </div>

      {user ? (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <textarea
            className="input"
            rows={3}
            placeholder="Write a comment…"
            value={content}
            maxLength={2000}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Your comment"
          />
          <button type="submit" className="btn btn-primary" disabled={submitting || !content.trim()}>
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-slate-500">
          <Link to="/login" className="font-medium text-indigo-600 underline underline-offset-4">
            Log in
          </Link>{' '}
          to join the conversation.
        </p>
      )}

      <div className="mt-6">
        <ErrorMessage>{error}</ErrorMessage>
        {loading && !comments && <Spinner />}
        {comments?.length === 0 && <p className="py-4 text-sm text-slate-500">No comments yet.</p>}
        {comments?.length > 0 && (
          <ul>
            {comments.map((comment) => (
              <Comment key={comment._id} comment={comment} onChanged={reload} />
            ))}
          </ul>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </section>
  );
}
