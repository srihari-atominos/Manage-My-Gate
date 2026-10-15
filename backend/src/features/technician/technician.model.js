import mongoose from 'mongoose';
import { buildStaffPhotoUrl } from '../../utils/staffPhoto.utils.js';
import { STAFF_CATEGORIES, STAFF_CATEGORY_VALUES } from './staffCategory.utils.js';

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
  // Free-text trade, used only when department is 'Others' (e.g. "Gardener", "Pest control")
  departmentOther: {
    type: String,
    trim: true,
    maxlength: 60,
    default: ''
  },
  type: {
    type: String,
    required: true,
    default: 'In-House Staff',
    enum: ['In-House Staff', 'External Vendor', 'Community Staff']
  },
  // Selected from Role Builder. Its scope is the authoritative Community/Unit staff classification.
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null,
    index: true,
  },
  // Community Staff (Global Staff) vs Unit Staff (Internal Staff); see staffCategory.utils.js
  staffCategory: {
    type: String,
    enum: STAFF_CATEGORY_VALUES,
    default: STAFF_CATEGORIES.COMMUNITY
  },
  // Community staff only: true keeps them on community work and hides them from residents' unit allocation
  communityOnly: {
    type: Boolean,
    default: false
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
  designation: {
    type: String,
    trim: true,
    default: ''
  },
  staffCode: {
    type: String,
    trim: true,
    sparse: true
  },
  qrValidFrom: {
    type: Date,
    default: null
  },
  qrValidUntil: {
    type: Date,
    default: null
  },
  // Storage key of the staff photo (never exposed directly; clients receive a signed `photoUrl`)
  photoKey: {
    type: String,
    trim: true,
    default: null
  },
  // Bumped to revoke every previously issued QR pass (see staffQr.utils.js)
  qrVersion: {
    type: Number,
    default: 0,
    min: 0
  },
  shiftWindow: {
    startTime: { type: String, trim: true, default: '' },
    endTime: { type: String, trim: true, default: '' },
    daysOfWeek: [{ type: Number }] // 0 = Sun, 1 = Mon, ..., 6 = Sat
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.photoUrl = buildStaffPhotoUrl(ret);
      delete ret.photoKey;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      ret.photoUrl = buildStaffPhotoUrl(ret);
      delete ret.photoKey;
      return ret;
    }
  }
});

technicianSchema.index({ orgId: 1, department: 1 });
technicianSchema.index({ orgId: 1, isDeleted: 1 });
technicianSchema.index({ orgId: 1, staffCode: 1 }, { sparse: true });
technicianSchema.index({ orgId: 1, userId: 1 });
technicianSchema.index({ orgId: 1, staffCategory: 1, status: 1 });

export default mongoose.model('Technician', technicianSchema);
