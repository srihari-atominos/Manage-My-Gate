import mongoose from 'mongoose';

const enquiryActivitySchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Note', 'StatusChange', 'System'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('EnquiryActivity', enquiryActivitySchema);
