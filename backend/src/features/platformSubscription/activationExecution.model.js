import mongoose from 'mongoose';

const { Schema } = mongoose;

const activationExecutionSchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformInvoice',
      default: null,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    activationKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['STARTED', 'COMPLETED', 'FAILED'],
      default: 'STARTED',
      index: true,
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

const ActivationExecution = mongoose.models.ActivationExecution || mongoose.model('ActivationExecution', activationExecutionSchema);

export default ActivationExecution;
