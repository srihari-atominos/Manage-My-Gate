import mongoose from 'mongoose';

const { Schema } = mongoose;

const invoiceSequenceSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    currentNumber: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSequenceSchema.index({ organizationId: 1, year: 1 }, { unique: true });

const InvoiceSequence = mongoose.models.InvoiceSequence || mongoose.model('InvoiceSequence', invoiceSequenceSchema);

export default InvoiceSequence;
