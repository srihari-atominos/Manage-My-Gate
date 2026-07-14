import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
    enum: ['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Carpentry', 'Others']
  },
  type: {
    type: String,
    required: true,
    enum: ['In-House Staff', 'External Vendor']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Active'
  },
  whatsappEnabled: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

technicianSchema.index({ orgId: 1, department: 1 });
technicianSchema.index({ orgId: 1, isDeleted: 1 });

export default mongoose.model('Technician', technicianSchema);
