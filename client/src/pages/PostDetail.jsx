import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useFetch } from '../hooks/useFetch';
import CommentSection from '../components/CommentSection';
import { Avatar, ErrorMessage, Spinner } from '../components/ui';
import { formatDateTime } from '../utils/format';

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useNotifications();
  const { data: post, loading, error } = useFetch(() => postsApi.getBySlug(slug), [slug]);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage>{error}</ErrorMessage>
        <Link to="/" className="btn">
          ← Back to posts
        </Link>
      </div>
    );
  }

  const canManage = user && (isAdmin || post.author?._id === user._id);
  const authorName = post.author?.name || 'Unknown author';
  // Average reading speed of about 200 words per minute.
  const readingMinutes = Math.max(1, Math.round(post.content.trim().split(/\s+/).length / 200));

  const remove = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await postsApi.remove(post._id);
      toast('Post deleted', 'success');
      navigate('/');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-3xl pt-4">
      <Link to="/" className="meta tracking-widest uppercase hover:text-indigo-600">
        ← All posts
      </Link>
      <article className="pt-7">
        <h1 className="font-display text-5xl leading-[1.02] text-balance sm:text-7xl">{post.title}</h1>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-b border-t-slate-900 border-b-slate-200 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={authorName} size="lg" />
            <div>
              <p className="text-[15px] font-semibold">{authorName}</p>
              <p className="meta mt-0.5">
                {formatDateTime(post.createdAt)} · {readingMinutes} min read
                {post.updatedAt !== post.createdAt && ` · updated ${formatDateTime(post.updatedAt)}`}
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Link to={`/posts/${post.slug}/edit`} className="btn btn-sm">
                Edit
              </Link>
              <button type="button" className="btn btn-sm btn-danger" onClick={remove}>
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Rendered as plain text, so user content can never inject markup. */}
        <div className="mt-8 text-xl leading-[1.7] whitespace-pre-wrap">{post.content}</div>
      </article>

      <CommentSection postId={post._id} />
    </div>
  );
}
