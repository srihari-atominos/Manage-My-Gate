import mongoose from 'mongoose';

const { Schema } = mongoose;

const customerSnapshotSchema = new Schema(
  {
    customerName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, default: null },
  },
  { _id: false }
);

const commercialSnapshotSchema = new Schema(
  {
    organizationName: { type: String, required: true },
    planName: { type: String, required: true },
    villaCount: { type: Number, required: true },
  },
  { _id: false }
);

const platformInvoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
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
    billingScheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'BillingSchedule',
      default: null,
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    customerSnapshot: {
      type: customerSnapshotSchema,
      required: true,
    },
    commercialSnapshot: {
      type: commercialSnapshotSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    vatAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountOutstanding: {
      type: Number,
      required: true,
      min: 0,
    },
    lastPaymentAt: {
      type: Date,
      default: null,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    invoiceChecksum: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'],
      default: 'ISSUED',
      index: true,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformInvoice = mongoose.model('PlatformInvoice', platformInvoiceSchema);

export default PlatformInvoice;
