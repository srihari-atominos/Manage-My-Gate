import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSubSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderType: {
      type: String,
      enum: ['AGENT', 'CUSTOMER'],
      required: [true, 'Sender type is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
    messageId: {
      type: String,
      trim: true,
      default: null,
    },
    inReplyTo: {
      type: String,
      trim: true,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const crmThreadSchema = new Schema(
  {
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      required: [true, 'Inquiry ID is required'],
      unique: true,
      index: true,
    },
    messages: [messageSubSchema],
  },
  {
    timestamps: true,
  }
);

const CrmThread = mongoose.model('CrmThread', crmThreadSchema);

export default CrmThread;
