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
    status: {
      type: String,
      enum: ['NEW', 'QUALIFIED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'],
      default: 'NEW',
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const CrmInquiry = mongoose.model('CrmInquiry', crmInquirySchema);

export default CrmInquiry;
