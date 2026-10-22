import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({ itemName: { type: String, required: true, trim: true }, quantity: { type: Number, required: true, min: 0.0001 }, unit: { type: String, required: true, trim: true }, unitPrice: { type: Number, required: true, min: 0 }, lineTotal: { type: Number, required: true, min: 0 } }, { _id: true });
const attachmentSchema = new mongoose.Schema({ url: { type: String, required: true }, storageName: { type: String, required: true }, filename: String, mimeType: String, uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
const expenseSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  expenseNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true }, description: { type: String, default: '' },
  expenseType: { type: String, enum: ['PURCHASE', 'REPAIRS_MAINTENANCE', 'BILLS_UTILITIES', 'SERVICES_LABOUR', 'OTHER'], required: true },
  category: { type: String, required: true, trim: true }, vendor: { name: { type: String, default: '' }, contact: { type: String, default: '' }, upiId: { type: String, default: '' } },
  expenseDate: { type: Date, required: true }, invoiceNumber: String, invoiceDate: Date, dueDate: Date,
  items: { type: [itemSchema], default: [] }, subtotal: { type: Number, required: true, min: 0 }, taxAmount: { type: Number, default: 0, min: 0 }, additionalCharges: { type: Number, default: 0, min: 0 }, totalAmount: { type: Number, required: true, min: 0.01 },
  recordedPaidAmount: { type: Number, default: 0, min: 0 }, upiAttemptReservedAmount: { type: Number, default: 0, min: 0 }, confirmedPaidAmount: { type: Number, default: 0, min: 0 }, outstandingAmount: { type: Number, required: true, min: 0 },
  settlementStatus: { type: String, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'], default: 'UNPAID', index: true }, lifecycleStatus: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE', index: true }, revision: { type: Number, default: 0, min: 0 }, cancelledAt: { type: Date, default: null }, cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, cancellationReason: { type: String, default: '' },
  attachments: { type: [attachmentSchema], default: [] }, recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, idempotencyKey: { type: String, sparse: true },
}, { timestamps: true });
expenseSchema.index({ orgId: 1, expenseDate: -1 }); expenseSchema.index({ orgId: 1, category: 1 }); expenseSchema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
export default mongoose.model('Expense', expenseSchema);


