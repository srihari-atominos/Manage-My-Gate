import mongoose from 'mongoose';

const noticeCommentSchema = new mongoose.Schema(
  {
    noticeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notice',
      required: [true, 'Notice ID is required'],
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoticeComment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['Active', 'Hidden', 'Deleted'],
      default: 'Active',
    },
    authorName: {
      type: String,
      default: '',
    },
    authorRole: {
      type: String,
      default: 'Resident',
    },
    isAdminComment: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

noticeCommentSchema.index({ noticeId: 1, createdAt: 1 });
noticeCommentSchema.index({ orgId: 1, noticeId: 1, status: 1 });

export const NoticeComment = mongoose.model('NoticeComment', noticeCommentSchema);
export default NoticeComment;
