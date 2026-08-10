import mongoose from 'mongoose';

const enquiryInsightSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      required: true,
      unique: true, // One insight document per enquiry that gets updated
      index: true,
    },
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    conversionProbability: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    revenueEstimate: {
      monthly: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },
    aiInsights: [{
      type: String,
    }],
    recommendations: [{
      type: String,
    }],
  },
  { timestamps: true }
);

export default mongoose.model('EnquiryInsight', enquiryInsightSchema);
