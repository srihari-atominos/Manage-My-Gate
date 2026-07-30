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
    startTime: {
      type: Date,
      required: [true, 'Start date and time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'End date and time is required'],
      index: true,
    },
    platformParticipants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    customerParticipants: [
      {
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
      },
    ],
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
