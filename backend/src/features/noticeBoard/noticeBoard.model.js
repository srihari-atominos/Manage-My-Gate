import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['General', 'Maintenance', 'Events', 'Emergency', 'Meetings'],
      default: 'General',
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['Draft', 'Published', 'Scheduled', 'Archived', 'Expired'],
      default: 'Draft',
    },
    image: {
      type: String,
      default: '',
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          filename: { type: String, required: true },
          uploadTimestamp: { type: Date, default: Date.now }
        }
      ],
      default: [],
    },
    scheduleDate: {
      type: Date,
      default: null,
    },
    readBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    bookmarkedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compounded index for list queries with filters, status, pinning, and sorting
noticeSchema.index({ orgId: 1, status: 1, isPinned: -1, createdAt: -1 });

// Indexes for frequently sorted fields to avoid in-memory sorts in aggregation
noticeSchema.index({ orgId: 1, expiryDate: 1 });
noticeSchema.index({ orgId: 1, priority: 1 });

// Text index for search functionality
noticeSchema.index({ title: 'text', description: 'text' });

export const Notice = mongoose.model('Notice', noticeSchema);
export default Notice;
