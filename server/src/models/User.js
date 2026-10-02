const { Schema, model } = require('mongoose');
const { ROLES } = require('../constants');

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Optional because a Facebook account may not share an email address.
    email: { type: String, lowercase: true, trim: true },
    // Absent for accounts created through social login.
    password: { type: String, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    provider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
    googleId: { type: String },
    facebookId: { type: String },
    isActive: { type: Boolean, default: true },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ facebookId: 1 }, { unique: true, sparse: true });
userSchema.index({ 'refreshTokens.tokenHash': 1 });
userSchema.index({ createdAt: -1 });

module.exports = model('User', userSchema);
