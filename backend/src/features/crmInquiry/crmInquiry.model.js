import mongoose from 'mongoose';

const { Schema } = mongoose;

const crmInquirySchema = new Schema(
  {
    inquiryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    unitCount: {
      type: Number,
      required: [true, 'Unit count is required'],
      min: [1, 'Unit count must be at least 1'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: null,
    },
    selectedFeatures: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['NEW', 'QUALIFIED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'],
      default: 'NEW',
    },
    originSource: {
      type: String,
      enum: ['WEB_FORM', 'MANUAL'],
      default: 'MANUAL',
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const CrmInquiry = mongoose.model('CrmInquiry', crmInquirySchema);

export default CrmInquiry;
