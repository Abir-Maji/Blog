const { z } = require('zod');
const { objectId } = require('./common');

const body = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
});

const postParams = z.object({ postId: objectId });

module.exports = { body, postParams };
