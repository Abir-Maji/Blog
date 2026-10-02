// Small presentational building blocks shared across pages.

const avatarSizes = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-xs', lg: 'h-10 w-10 text-sm' };

// Initials in a circle; ink or accent, picked from the name so it stays stable.
export function Avatar({ name = '?', size = 'md' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono text-white ${hash % 2 ? 'bg-indigo-600' : 'bg-slate-900'} ${avatarSizes[size]}`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="meta flex items-center justify-center gap-3 py-16" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      {label}
    </div>
  );
}

export function ErrorMessage({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      {children}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="border-b border-slate-200 py-16 text-center font-display text-2xl text-slate-500">{children}</p>;
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Pagination">
      <button type="button" className="btn btn-sm" disabled={!meta.hasPrevPage} onClick={() => onPageChange(meta.page - 1)}>
        ← Previous
      </button>
      <span className="meta">
        Page {meta.page} of {meta.totalPages}
      </span>
      <button type="button" className="btn btn-sm" disabled={!meta.hasNextPage} onClick={() => onPageChange(meta.page + 1)}>
        Next →
      </button>
    </nav>
  );
}
