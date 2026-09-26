import mongoose from 'mongoose';

const { Schema } = mongoose;

const issueReportConfigSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'PLATFORM_ADMIN_REPORT_EMAIL',
      trim: true,
    },
    platformAdminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'issue_report_configs',
  }
);

export const IssueReportConfig =
  mongoose.models.IssueReportConfig ||
  mongoose.model('IssueReportConfig', issueReportConfigSchema, 'issue_report_configs');

export default IssueReportConfig;
