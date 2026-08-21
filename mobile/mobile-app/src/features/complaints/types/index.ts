export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintStatus =
  | 'Submitted'
  | 'Open'
  | 'Waiting For Assignment'
  | 'Waiting For Acceptance'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'On Hold'
  | 'Paused'
  | 'Work Completed'
  | 'Waiting For Resident Confirmation'
  | 'Completed'
  | 'Closed'
  | 'Rejected'
  | 'Cancelled'
  | 'Reopened'
  | 'Escalated';

export interface TimelineEvent {
  status: string;
  action: string;
  userId?: string;
  userRole?: string;
  userName?: string;
  remarks?: string;
  attachments?: string[];
  date?: string;
}

export interface ComplaintLocation {
  building?: string;
  tower?: string;
  floor?: string;
  flat?: string;
  commonArea?: string;
  landmark?: string;
  exactLocation?: string;
}

export interface ComplaintFeedback {
  overallRating?: number;
  technicianRating?: number;
  serviceRating?: number;
  cleanlinessRating?: number;
  communicationRating?: number;
  remarks?: string;
  feedbackDate?: string;
}

export interface Complaint {
  _id: string;
  orgId?: string;
  complaintNumber: string;
  residentId: any;
  residentName?: string;
  residentEmail?: string;
  residentMobile?: string;
  category: string;
  subCategory?: string;
  department?: string;
  title: string;
  description?: string;
  additionalNotes?: string;
  priority: ComplaintPriority;
  location?: ComplaintLocation;
  preferredVisitDate?: string;
  preferredVisitTime?: string;
  expectedSLA?: string;
  slaDueDate?: string;
  slaStatus?: string;
  attachments?: string[];
  status: ComplaintStatus;
  workflowStatus?: string;
  assignedTechnicianId?: any;
  assignedTechnicianName?: string;
  assignedTechnicianPhone?: string;
  isBroadcast?: boolean;
  broadcastTechnicianIds?: any[];
  vendor?: string;
  team?: string;
  timeline?: TimelineEvent[];
  feedback?: ComplaintFeedback;
  createdAt: string;
  updatedAt?: string;
}

export interface ComplaintPagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export interface ComplaintDashboardData {
  kpis: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    cancelled: number;
    escalated: number;
    assigned: number;
    critical: number;
    reopened: number;
    slaBreached: number;
    today: number;
    todayResolved?: number;
    averageResolutionHours: number;
    withinSla: number;
    residentSatisfactionPercentage: number;
  };
  categoryBreakdown: Array<{ _id: string; count: number; open: number; resolved: number }>;
  priorityBreakdown: Array<{ _id: string; count: number }>;
  statusBreakdown: Array<{ _id: string; count: number }>;
  recentComplaints: Complaint[];
}

export interface AssignTechnicianPayload {
  technicianId?: string;
  assignedTechnicianId?: string;
  technicianIds?: string[];
  assignmentType?: 'direct' | 'broadcast' | 'vendor';
  technicianName?: string;
  vendor?: string;
  team?: string;
  instructions?: string;
  preferredVisitDate?: string;
  preferredVisitTime?: string;
  reassignmentReason?: string;
}
