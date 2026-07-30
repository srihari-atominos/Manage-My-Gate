import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  referenceModel: {
    type: String,
    enum: ['Invoice', 'Payment', 'Adjustment'],
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'INVOICE_GENERATED', 
      'PAYMENT_RECEIVED', 
      'PAYMENT_REFUNDED', 
      'CREDIT_NOTE_APPLIED', 
      'WRITE_OFF_APPLIED',
      'LATE_FEE_APPLIED',
      'CARRY_FORWARD',
      'MANUAL_CORRECTION'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  idempotencyKey: {
    type: String,
    index: { unique: true, sparse: true }
  }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

// Compound index for cursor pagination on Resident Statements
ledgerSchema.index({ orgId: 1, userId: 1, timestamp: -1 });

export const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
