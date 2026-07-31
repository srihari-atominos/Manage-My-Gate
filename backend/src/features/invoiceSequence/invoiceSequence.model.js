import mongoose from 'mongoose';

const invoiceSequenceSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  fy: {
    type: String,
    required: true
  },
  currentSequence: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Ensure exact sequence engine boundaries per FY
invoiceSequenceSchema.index({ orgId: 1, fy: 1 }, { unique: true });

export const InvoiceSequence = mongoose.model('InvoiceSequence', invoiceSequenceSchema);
export default InvoiceSequence;
