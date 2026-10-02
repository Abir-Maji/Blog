const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');

const title = z.string().trim().min(3, 'Title must be at least 3 characters').max(150);
const content = z.string().trim().min(10, 'Content must be at least 10 characters').max(50000);

const create = z.object({ title, content });

const update = z
  .object({ title: title.optional(), content: content.optional() })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: 'Provide a title or content to update',
  });

const listQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  author: objectId.optional(),
});

const adminListQuery = listQuery.extend({
  status: z.enum(['all', 'active', 'deleted']).default('all'),
});

const slugParams = z.object({ slug: z.string().trim().min(1).max(120) });

module.exports = { create, update, listQuery, adminListQuery, slugParams };
