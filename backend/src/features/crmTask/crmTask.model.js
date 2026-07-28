import mongoose from 'mongoose';

const { Schema } = mongoose;

const crmTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    relatedInquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      default: null,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING',
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const CrmTask = mongoose.model('CrmTask', crmTaskSchema);

export default CrmTask;
