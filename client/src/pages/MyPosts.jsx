import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useFetch } from '../hooks/useFetch';
import { EmptyState, ErrorMessage, Pagination, Spinner } from '../components/ui';
import PostCard from '../components/PostCard';

const PAGE_SIZE = 6;

export default function MyPosts() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);

  const { data: posts, meta, loading, error, reload } = useFetch(
    () => postsApi.list({ author: user._id, page, limit: PAGE_SIZE }),
    [user._id, page]
  );

  const remove = async (post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    try {
      await postsApi.remove(post._id);
      toast('Post deleted', 'success');
      // Step back if the last post on this page was removed.
      if (posts.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <section>
      <div className="mb-8 flex items-end justify-between pt-4">
        <h1 className="page-title">My posts</h1>
        <Link to="/posts/new" className="btn btn-primary">
          New post
        </Link>
      </div>

      <ErrorMessage>{error}</ErrorMessage>
      {loading && !posts && <Spinner />}
      {posts?.length === 0 && <EmptyState>You have not written any posts yet.</EmptyState>}

      {posts?.length > 0 && (
        <div className="border-t border-slate-900">
          {posts.map((post, i) => (
            <PostCard
              key={post._id}
              post={post}
              index={(page - 1) * PAGE_SIZE + i + 1}
              actions={
                <>
                  <Link to={`/posts/${post.slug}/edit`} className="btn btn-sm">
                    Edit
                  </Link>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(post)}>
                    Delete
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </section>
  );
}
