const { slugify, uniqueSlug } = require('../../src/utils/slugify');

describe('slugify', () => {
  it('lowercases and replaces spaces and punctuation with hyphens', () => {
    expect(slugify('Hello, World! This is MERN')).toBe('hello-world-this-is-mern');
  });

  it('strips accents and trims leading/trailing hyphens', () => {
    expect(slugify('  Café déjà vu -- ')).toBe('cafe-deja-vu');
  });

  it('limits the length without leaving a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(79)} b c d`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns the plain slug when it is free', async () => {
    await expect(uniqueSlug('My Post', async () => false)).resolves.toBe('my-post');
  });

  it('appends a suffix when the slug is taken', async () => {
    const taken = new Set(['my-post']);
    const slug = await uniqueSlug('My Post', async (s) => taken.has(s));
    expect(slug).toMatch(/^my-post-[0-9a-f]{6}$/);
  });

  it('falls back to "post" for titles with no usable characters', async () => {
    await expect(uniqueSlug('???', async () => false)).resolves.toBe('post');
  });
});
