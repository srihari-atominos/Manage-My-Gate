import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  subCategories: [{ type: String }],
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

const slaRuleSchema = new mongoose.Schema({
  priority: { type: String, required: true }, // Low, Medium, High, Critical
  resolveWithinHours: { type: Number, required: true },
  escalationLevel1Hours: { type: Number },
  escalationLevel2Hours: { type: Number },
  escalationLevel3Hours: { type: Number }
});

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  manager: { type: String },
  isActive: { type: Boolean, default: true }
});

const workflowStatusSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Open, Assigned, In Progress, etc.
  enabled: { type: Boolean, default: true },
  color: { type: String, default: '#000000' }
});

const notificationRuleSchema = new mongoose.Schema({
  event: { type: String, required: true }, // e.g. 'Complaint Created'
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  push: { type: Boolean, default: true },
  inApp: { type: Boolean, default: true }
});

const feedbackQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  isRequired: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

const complaintSettingsSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true,
    unique: true // One settings document per organization
  },
  categories: { type: [categorySchema], default: [] },
  departments: { type: [departmentSchema], default: [] },
  priorities: { type: [String], default: ['Low', 'Medium', 'High', 'Critical'] },
  severityLevels: { type: [String], default: ['Minor', 'Major', 'Severe'] },
  slaRules: { type: [slaRuleSchema], default: [] },
  assignmentRules: {
    autoAssign: { type: Boolean, default: false },
    method: { type: String, enum: ['Manual', 'Round Robin', 'Workload Based', 'Skill Based', 'Department Based', 'Vendor Assignment'], default: 'Manual' }
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] } // 0=Sun, 1=Mon...
  },
  holidayCalendar: { type: [String], default: [] }, // YYYY-MM-DD strings
  workflow: {
    autoCloseDays: { type: Number, default: 7 },
    reopenLimit: { type: Number, default: 2 },
    defaultStatus: { type: String, default: 'Open' },
    statuses: { type: [workflowStatusSchema], default: [] }
  },
  notifications: {
    events: { type: [notificationRuleSchema], default: [] }
  },
  residentFeedback: {
    enabled: { type: Boolean, default: true },
    allowAnonymous: { type: Boolean, default: false },
    allowEdit: { type: Boolean, default: true },
    mandatoryBeforeClosing: { type: Boolean, default: false },
    expiryDays: { type: Number, default: 7 }
  },
  ratingConfig: {
    scale: { type: Number, default: 5 }, // 1 to 5 Star Rating
    defaultRating: { type: Number, default: 0 },
    labels: { type: Map, of: String, default: { '1': 'Poor', '5': 'Excellent' } },
    colors: { type: Map, of: String, default: {} }
  },
  feedbackQuestions: { type: [feedbackQuestionSchema], default: [] },
  commentSettings: {
    allowComments: { type: Boolean, default: true },
    minLength: { type: Number, default: 0 },
    maxLength: { type: Number, default: 500 },
    mandatoryForLowRatings: { type: Boolean, default: true },
    lowRatingThreshold: { type: Number, default: 2 }
  },
  feedbackVisibility: {
    resident: { type: Boolean, default: true },
    technician: { type: Boolean, default: false },
    facilityManager: { type: Boolean, default: true },
    admin: { type: Boolean, default: true },
    superAdmin: { type: Boolean, default: true }
  },
  feedbackAnalytics: {
    averageRating: { type: Boolean, default: true },
    technicianRating: { type: Boolean, default: true },
    vendorRating: { type: Boolean, default: true },
    departmentRating: { type: Boolean, default: true },
    monthlyRating: { type: Boolean, default: true },
    residentSatisfaction: { type: Boolean, default: true }
  },
  general: {
    duplicateDetection: { type: Boolean, default: false },
    duplicateTimeWindowHours: { type: Number, default: 24 },
    emergencyRules: { type: String, default: 'Escalate Immediately' }
  },
  attachments: {
    maxSizeMB: { type: Number, default: 10 },
    maxFiles: { type: Number, default: 5 },
    allowedTypes: { type: [String], default: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4', 'audio/mpeg', 'audio/webm'] }
  },
  ticketFormat: {
    prefix: { type: String, default: 'CMP' },
    includeYear: { type: Boolean, default: true },
    sequenceLength: { type: Number, default: 6 } // CMP-2026-000001
  }
}, { timestamps: true });

export default mongoose.model('ComplaintSettings', complaintSettingsSchema);
