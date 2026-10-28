import mongoose from 'mongoose';
const expensePaymentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMethod: { type: String, enum: ['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER'], required: true },
  paymentApplication: { type: String, enum: ['GOOGLE_PAY', 'PHONEPE', 'BHIM', 'PAYTM', 'OTHER_UPI_APP', 'NETBANKING', 'NOT_SPECIFIED'], default: 'NOT_SPECIFIED' },
  fundingSource: { type: String, enum: ['COMMUNITY_BANK_ACCOUNT', 'PETTY_CASH', 'PERSONAL_ACCOUNT', 'OTHER'], required: true },
  paymentDate: { type: Date, required: true }, transactionReference: { type: String, default: null }, attachmentUrl: { type: String, default: null },
  recordType: { type: String, enum: ['RECORDED', 'ATTEMPT'], default: 'RECORDED' }, attemptStatus: { type: String, enum: ['CREATED', 'LAUNCHED', 'PENDING', 'USER_REPORTED_SUCCESS', 'USER_REPORTED_FAILED', 'UNKNOWN', 'CANCELLED'], default: null }, externalTransactionReference: { type: String, default: null }, userReportedOutcome: { type: String, enum: ['COMPLETED', 'NOT_COMPLETED', 'UNKNOWN'], default: null }, userReportedAt: { type: Date, default: null }, userReportedEvidence: { type: [mongoose.Schema.Types.Mixed], default: [] }, userReportedAmount: { type: Number, default: null, min: 0 }, externalResponse: { type: mongoose.Schema.Types.Mixed, default: null }, verificationStatus: { type: String, enum: ['RECORDED', 'RECONCILED', 'PENDING_VERIFICATION', 'VOIDED'], default: 'RECORDED' }, voidedAt: { type: Date, default: null }, voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, voidReason: { type: String, default: '' }, voidedTransactionReference: { type: String, default: null }, reconciledAt: { type: Date, default: null }, reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, reconciliationNote: { type: String, default: '' }, reconciliationEvidence: { type: [mongoose.Schema.Types.Mixed], default: [] }, verificationHistory: { type: [{ fromStatus: String, toStatus: String, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, changedAt: { type: Date, default: Date.now }, note: String }], default: [] }, recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, idempotencyKey: { type: String, sparse: true }
}, { timestamps: true });
expensePaymentSchema.index({ orgId: 1, expenseId: 1, paymentDate: -1 });
expensePaymentSchema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
expensePaymentSchema.index({ orgId: 1, transactionReference: 1 }, { unique: true, partialFilterExpression: { transactionReference: { $type: 'string' } } });
export default mongoose.model('ExpensePayment', expensePaymentSchema);


