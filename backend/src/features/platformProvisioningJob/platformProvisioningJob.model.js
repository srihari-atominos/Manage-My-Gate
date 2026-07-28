import mongoose from 'mongoose';

const platformProvisioningJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: [true, 'Job ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      required: [true, 'Order ID is required'],
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformPayment',
      required: [true, 'Payment ID is required'],
      index: true,
    },
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    requestedFeatures: {
      type: [String],
      required: [true, 'Requested features are required'],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY_PENDING', 'MANUAL_REVIEW'],
        message: '{VALUE} is not a valid job status',
      },
      default: 'PENDING',
      index: true,
    },
    currentStep: {
      type: String,
      enum: {
        values: [
          'INIT',
          'CREATE_ORG',
          'CREATE_WORKSPACE',
          'ACTIVATE_ENTITLEMENTS',
          'CREATE_ADMIN',
          'GENERATE_TEMPLATES',
          'FINISHED',
        ],
        message: '{VALUE} is not a valid current step',
      },
      default: 'INIT',
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformProvisioningJob = mongoose.model(
  'PlatformProvisioningJob',
  platformProvisioningJobSchema
);

export default PlatformProvisioningJob;
