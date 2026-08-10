import mongoose from 'mongoose';

const enquiryStageHistorySchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    exitedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // duration in milliseconds
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('EnquiryStageHistory', enquiryStageHistorySchema);
