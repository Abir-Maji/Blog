import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postsApi } from '../api';
import { useFetch } from '../hooks/useFetch';
import PostCard from '../components/PostCard';
import { EmptyState, ErrorMessage, Pagination, Spinner } from '../components/ui';

const PAGE_SIZE = 6;

export default function Home() {
  // Page and search live in the URL so results can be linked and refreshed.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const search = params.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);

  const { data: posts, meta, loading, error } = useFetch(
    () => postsApi.list({ page, limit: PAGE_SIZE, search: search || undefined }),
    [page, search]
  );

  const updateParams = (next) => {
    const merged = { page: String(page), search, ...next };
    const clean = {};
    if (merged.search) clean.search = merged.search;
    if (merged.page !== '1') clean.page = merged.page;
    setParams(clean);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateParams({ search: searchInput.trim(), page: '1' });
  };

  return (
    <section>
      <div className="grid items-end gap-x-12 gap-y-8 pt-8 pb-14 lg:grid-cols-2 lg:pt-12">
        <h1 className="font-display text-6xl leading-[0.98] text-balance sm:text-7xl lg:text-[5.25rem]">
          Stories and ideas <em className="text-indigo-600">worth sharing.</em>
        </h1>
        <div className="flex flex-col gap-5 lg:pb-2.5">
          <p className="text-lg leading-relaxed text-slate-500">Read what the community is writing, or publish a post of your own.</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
              <input
                className="input pl-10"
                placeholder="Search posts"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search posts"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="eyebrow">
        <h2>{search ? `Results for "${search}"` : 'Latest posts'}</h2>
        {meta && (
          <span className="text-slate-500">
            {meta.total} {meta.total === 1 ? 'post' : 'posts'}
          </span>
        )}
      </div>

      <div className="mt-6 empty:hidden">
        <ErrorMessage>{error}</ErrorMessage>
      </div>
      {loading && <Spinner />}

      {!loading && !error && posts.length === 0 && (
        <EmptyState>{search ? `No posts match "${search}".` : 'No posts yet. Be the first to write one!'}</EmptyState>
      )}

      {!loading && !error && posts.length > 0 && (
        <div>
          {posts.map((post, i) => (
            <PostCard key={post._id} post={post} index={(page - 1) * PAGE_SIZE + i + 1} />
          ))}
        </div>
      )}

      {!loading && <Pagination meta={meta} onPageChange={(next) => updateParams({ page: String(next) })} />}
    </section>
  );
}
