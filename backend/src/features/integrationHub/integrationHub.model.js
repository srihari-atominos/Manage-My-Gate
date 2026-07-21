import mongoose from 'mongoose';

/**
 * Subdocument schema representing an encrypted credential key-value pair.
 */
const credentialSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Credential key is required (e.g., apiKey, accountSid, authToken)'],
      trim: true,
    },
    encryptedValue: {
      type: String,
      required: [true, 'Encrypted value is required'],
    },
    iv: {
      type: String,
      required: [true, 'Initialization vector (iv) is required'],
    },
    authTag: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

/**
 * Schema for user integration connections.
 */
const integrationHubSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    provider: {
      type: String,
      required: [true, 'Provider name is required'],
      enum: ['openai', 'twilio', 'resend', 'smtp', 'firebase', 'messagecentral', 'banking', 'razorpay'],
      trim: true,
    },

    accountLabel: {
      type: String,
      required: [true, 'Account label is required'],
      trim: true,
    },
    credentials: {
      type: [credentialSchema],
      required: [true, 'Credentials array is required'],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'At least one credential must be provided',
      },
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected'],
      default: 'connected',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce that an organization can have at most one connection setup per provider and account label combination
integrationHubSchema.index({ orgId: 1, provider: 1, accountLabel: 1 }, { unique: true });

export const IntegrationHub = mongoose.model('IntegrationHub', integrationHubSchema);
export default IntegrationHub;
