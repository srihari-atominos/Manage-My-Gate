import mongoose from 'mongoose';

const { Schema } = mongoose;

const stepExecutionSchema = new Schema(
  {
    stepName: {
      type: String,
      enum: [
        'CREATE_ORGANIZATION',
        'CREATE_WORKSPACE',
        'CREATE_ROLES',
        'CREATE_SUPER_ADMIN',
        'ACTIVATE_ENTITLEMENTS',
        'INITIALIZE_STORAGE',
        'INITIALIZE_NOTIFICATIONS',
        'FINALIZE_ONBOARDING',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
    },
    executionKey: { type: String, required: true },
    attemptCount: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    checksum: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const provisioningWorkflowSchema = new Schema(
  {
    workflowNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    correlationId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      default: null,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformSubscription',
      default: null,
    },
    customerSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'RETRYING', 'FAILED', 'COMPLETED', 'ROLLED_BACK'],
      default: 'QUEUED',
      index: true,
    },
    currentStepIndex: {
      type: Number,
      default: 0,
    },
    currentStepName: {
      type: String,
      default: 'CREATE_ORGANIZATION',
    },
    steps: {
      type: [stepExecutionSchema],
      default: [],
    },
    recoveryToken: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ProvisioningWorkflow = mongoose.model('ProvisioningWorkflow', provisioningWorkflowSchema);

export default ProvisioningWorkflow;
