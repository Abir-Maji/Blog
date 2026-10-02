const { Schema, model } = require('mongoose');

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true },
    content: { type: String, required: true },
    // Short preview stored with the post so list queries never load `content`.
    excerpt: { type: String, default: '' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalised so post lists do not need a count query per post.
    commentCount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' }, { weights: { title: 5, content: 1 } });

module.exports = model('Post', postSchema);
