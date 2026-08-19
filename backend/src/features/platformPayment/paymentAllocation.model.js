import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentAllocationSchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformInvoice',
      required: true,
      index: true,
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentAllocation = mongoose.models.PaymentAllocation || mongoose.model('PaymentAllocation', paymentAllocationSchema);

export default PaymentAllocation;
