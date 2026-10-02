import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format';

// One row of a post list: number, title and excerpt, then metadata or actions.
export default function PostCard({ post, index, actions }) {
  return (
    <article className="animate-fade-up group grid gap-x-6 gap-y-3 border-b border-slate-200 py-8 sm:grid-cols-[4rem_minmax(0,1fr)_12rem]">
      <span className="meta hidden pt-2.5 text-[13px] sm:block">{String(index).padStart(2, '0')}</span>

      <div>
        <Link to={`/posts/${post.slug}`}>
          <h2 className="font-display text-4xl leading-[1.1] transition-colors group-hover:text-indigo-600">{post.title}</h2>
        </Link>
        <p className="mt-2.5 line-clamp-2 max-w-2xl leading-relaxed text-slate-500">{post.excerpt}</p>
      </div>

      <div className="meta flex flex-col gap-1.5 sm:pt-2.5 sm:text-right">
        <span className="text-slate-900">{post.author?.name || 'Unknown author'}</span>
        <span>{formatDate(post.createdAt)}</span>
        <span>
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
        {actions && <div className="mt-2 flex gap-2 sm:justify-end">{actions}</div>}
      </div>
    </article>
  );
}
