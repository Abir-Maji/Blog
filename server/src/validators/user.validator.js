const { z } = require('zod');
const { paginationQuery } = require('./common');
const { ROLES } = require('../constants');

const listQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
});

const update = z
  .object({
    role: z.enum(Object.values(ROLES)).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: 'Provide a role or isActive to update',
  });

module.exports = { listQuery, update };
