import mongoose from 'mongoose';

const { Schema } = mongoose;

const renewalJobSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformSubscription',
      required: true,
      index: true,
    },
    renewalDate: {
      type: Date,
      required: true,
      index: true,
    },
    renewalInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformInvoice',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'GENERATED', 'NOTIFIED', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const RenewalJob = mongoose.models.RenewalJob || mongoose.model('RenewalJob', renewalJobSchema);

export default RenewalJob;
