const crypto = require('crypto');

const MAX_SLUG_LENGTH = 80;

function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

// `exists` is an async (slug) => boolean lookup, injected so this stays
// independent of the database.
async function uniqueSlug(text, exists) {
  const base = slugify(text) || 'post';
  if (!(await exists(base))) return base;
  for (;;) {
    const candidate = `${base}-${crypto.randomBytes(3).toString('hex')}`;
    if (!(await exists(candidate))) return candidate;
  }
}

module.exports = { slugify, uniqueSlug };
