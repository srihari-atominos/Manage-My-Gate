import mongoose from 'mongoose';

const { Schema } = mongoose;

const crmMeetingSchema = new Schema(
  {
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      required: [true, 'Inquiry ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
    },
    googleMeetLink: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
    },
  },
  {
    timestamps: true,
  }
);

const CrmMeeting = mongoose.model('CrmMeeting', crmMeetingSchema);

export default CrmMeeting;
