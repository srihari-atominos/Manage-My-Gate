import mongoose from 'mongoose';

const { Schema } = mongoose;

const billingScheduleSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    installmentNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    billingDate: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'INVOICED', 'PAID', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    generatedInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformInvoice',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

billingScheduleSchema.index({ orderId: 1, installmentNumber: 1 }, { unique: true });

const BillingSchedule = mongoose.models.BillingSchedule || mongoose.model('BillingSchedule', billingScheduleSchema);

export default BillingSchedule;
