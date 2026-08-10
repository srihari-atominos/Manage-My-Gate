import mongoose from 'mongoose';

const platformProvisioningJobSchema = new mongoose.Schema(
  {
    targetOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    sourceOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      required: true,
    },
    currentStep: {
      type: String,
      enum: ['INIT', 'CREATE_ORG', 'CREATE_WORKSPACE', 'CREATE_ADMIN', 'ACTIVATE_ENTITLEMENTS', 'GENERATE_TEMPLATES', 'FINISHED'],
      default: 'INIT',
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    errorLogs: {
      type: [String],
      default: [],
    },
    retries: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const PlatformProvisioningJob = mongoose.model('PlatformProvisioningJob', platformProvisioningJobSchema);
export default PlatformProvisioningJob;
