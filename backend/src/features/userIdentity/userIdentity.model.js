import mongoose from 'mongoose';

const userIdentitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    provider: {
      type: String,
      enum: ['google', 'microsoft', 'apple', 'azure_ad', 'keycloak', 'auth0'],
      required: [true, 'Provider is required'],
    },
    providerId: {
      type: String,
      required: [true, 'Provider ID is required'],
    },
    providerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    profileData: {
      type: mongoose.Schema.Types.Mixed, // Store provider-specific profile metadata if needed
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only link a specific provider once
userIdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
// Ensure a provider ID is strictly unique globally across our app
userIdentitySchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const UserIdentity = mongoose.model('UserIdentity', userIdentitySchema);
export default UserIdentity;
