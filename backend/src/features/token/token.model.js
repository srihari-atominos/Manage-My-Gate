import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
    },
    type: {
      type: String,
      enum: ['INVITATION', 'RESET'],
      required: [true, 'Token type is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours in seconds
    },
  }
);

export const Token = mongoose.model('Token', tokenSchema);
export default Token;
