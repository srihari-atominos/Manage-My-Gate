import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'Complaint Created', 'Comment Added'
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: { type: String }, // e.g., 'Resident', 'Technician', 'Admin'
  userName: { type: String },
  remarks: { type: String },
  attachments: { type: [String], default: [] },
  ipAddress: { type: String },
  browser: { type: String },
  device: { type: String },
  isInternal: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },
  complaintNumber: { type: String, required: true },
  
  // Resident Details
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  residentName: { type: String },
  residentEmail: { type: String },
  residentMobile: { type: String },
  
  // Complaint Details
  category: { type: String, required: true },
  subCategory: { type: String },
  department: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  aiAnalysisMetadata: {
    aiStatus: { type: String, default: null },
    aiCategory: { type: String, default: null },
    aiConfidence: { type: Number, default: null },
    aiTags: [{ type: String }]
  },
  additionalNotes: { type: String },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  
  // Location Details
  location: {
    building: { type: String },
    tower: { type: String },
    floor: { type: String },
    flat: { type: String },
    commonArea: { type: String },
    landmark: { type: String },
    exactLocation: { type: String }
  },
  
  // Scheduling
  preferredVisitDate: { type: Date },
  preferredVisitTime: { type: String }, // e.g., "Morning", "10:00 AM - 12:00 PM"
  expectedSLA: { type: String }, // e.g., "Immediate", "24 Hours"
  slaDueDate: { type: Date },
  
  // Attachments
  attachments: { type: [String], default: [] },
  
  // Status and Workflow
  status: { 
    type: String, 
    enum: [
      'Submitted', 'Open', 'Waiting For Assignment', 'Waiting For Acceptance', 'Assigned', 'Accepted', 'In Progress', 'On Hold',
      'Work Completed', 'Waiting For Resident Confirmation', 
      'Completed', 'Closed', 'Rejected', 'Cancelled', 'Reopened', 'Escalated'
    ],
    default: 'Open'
  },
  workflowStatus: {
    type: String,
    default: 'Waiting For Assignment'
  },
  
  // Assignment
  assignedTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTechnicianName: { type: String },
  assignedTechnicianPhone: { type: String },
  isBroadcast: { type: Boolean, default: false },
  broadcastTechnicianIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  vendor: { type: String },
  team: { type: String },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedByName: { type: String },
  assignedDate: { type: Date },
  acceptedDate: { type: Date },
  workStartedDate: { type: Date },
  expectedCompletionDate: { type: Date },
  escalationLevel: { type: Number, default: 0 },
  
  // Tracking
  timeline: { type: [timelineEventSchema], default: [] },
  
  // Feedback
  feedback: {
    overallRating: { type: Number, min: 1, max: 5 },
    technicianRating: { type: Number, min: 1, max: 5 },
    serviceRating: { type: Number, min: 1, max: 5 },
    cleanlinessRating: { type: Number, min: 1, max: 5 },
    communicationRating: { type: Number, min: 1, max: 5 },
    remarks: { type: String },
    feedbackDate: { type: Date }
  },
  
  // Resolution Details
  resolutionSummary: { type: String },
  resolutionNotes: { type: String },
  workDone: { type: String },
  technicianRemarks: { type: String },

  // Metrics
  resolvedAt: { type: Date },
  completionDate: { type: Date },
  closedAt: { type: Date },
  
  // Tracking Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
  
}, { timestamps: true });

// Ensure compound index for fast lookups
complaintSchema.index({ orgId: 1, status: 1 });
complaintSchema.index({ orgId: 1, residentId: 1 });
complaintSchema.index({ orgId: 1, assignedTechnicianId: 1 });
complaintSchema.index({ orgId: 1, category: 1 });

complaintSchema.index({ orgId: 1, complaintNumber: 1 }, { unique: true });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
