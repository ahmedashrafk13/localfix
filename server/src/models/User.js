import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

export const ROLES = ['customer', 'provider', 'admin'];
export const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];

export function defaultWeek() {
  // 0 = Sunday ... 6 = Saturday. Friday gets a shorter day, Sunday off by default.
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    enabled: day !== 0,
    from: '09:00',
    to: day === 5 ? '13:00' : '19:00',
  }));
}

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },
  { _id: false }
);

const certificationSchema = new Schema({
  title: { type: String, trim: true, maxlength: 120, required: true },
  issuer: { type: String, trim: true, maxlength: 120, default: '' },
  year: { type: Number, min: 1970, max: 2100 },
});

const galleryItemSchema = new Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, trim: true, maxlength: 140, default: '' },
    kind: { type: String, enum: ['before', 'after', 'work'], default: 'work' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const daySchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    enabled: { type: Boolean, default: true },
    from: { type: String, match: /^\d{2}:\d{2}$/, default: '09:00' },
    to: { type: String, match: /^\d{2}:\d{2}$/, default: '18:00' },
  },
  { _id: false }
);

const providerSchema = new Schema(
  {
    headline: { type: String, trim: true, maxlength: 100, default: '' },
    bio: { type: String, trim: true, maxlength: 1500, default: '' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    certifications: [certificationSchema],
    serviceAreas: [{ type: String, trim: true, maxlength: 60 }],
    startingPrice: { type: Number, min: 0, max: 1_000_000 },
    gallery: [galleryItemSchema],
    availability: {
      availableNow: { type: Boolean, default: true },
      weekly: { type: [daySchema], default: defaultWeek },
    },
    verification: {
      status: { type: String, enum: VERIFICATION_STATUSES, default: 'unverified' },
      documentPath: { type: String, select: false },
      idLast4: { type: String, default: '' },
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      note: { type: String, maxlength: 500, default: '' },
    },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'customer', index: true },
    avatar: { type: String, default: '' },
    city: { type: String, trim: true, maxlength: 60, default: 'Islamabad' },
    area: { type: String, trim: true, maxlength: 60, default: '' },
    location: { type: pointSchema, default: undefined },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    suspendedReason: { type: String, maxlength: 300, default: '' },
    lastSeenAt: Date,
    provider: { type: providerSchema, default: undefined },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ 'provider.categories': 1 });
userSchema.index({ 'provider.verification.status': 1 });
userSchema.index({ 'provider.ratingAvg': -1 });

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.virtual('isVerifiedProvider').get(function isVerifiedProvider() {
  return this.role === 'provider' && this.provider?.verification?.status === 'verified';
});

export const User = mongoose.model('User', userSchema);
