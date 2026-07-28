import mongoose from 'mongoose';

const amountsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const platformInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
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
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organisation ID is required'],
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    hsnSacCode: {
      type: String,
      required: [true, 'HSN/SAC code is required for GST compliance'],
      trim: true,
      default: '998313',
    },
    amounts: {
      type: amountsSchema,
      required: [true, 'Invoice amounts breakdown is required'],
    },
    gstin: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'UNPAID', 'PAID', 'VOID'],
        message: '{VALUE} is not a valid invoice status',
      },
      default: 'UNPAID',
      index: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformInvoice = mongoose.model('PlatformInvoice', platformInvoiceSchema);

export default PlatformInvoice;
