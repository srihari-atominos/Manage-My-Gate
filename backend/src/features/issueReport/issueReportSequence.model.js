import mongoose from 'mongoose';

const { Schema } = mongoose;

const issueReportSequenceSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'REPORT_SEQUENCE',
    },
    currentSequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'issue_report_sequences',
  }
);

export const IssueReportSequence =
  mongoose.models.IssueReportSequence ||
  mongoose.model('IssueReportSequence', issueReportSequenceSchema, 'issue_report_sequences');

export default IssueReportSequence;
