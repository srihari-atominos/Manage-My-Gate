import complaintService from './complaint.service.js';
import HttpError from '../../utils/httpError.utils.js';
import Technician from '../technician/technician.model.js';

class ComplaintController {
  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const residentId = req.user.id || req.user._id;
      const residentName = req.body.residentName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'Resident';
      
      const complaint = await complaintService.createComplaint(orgId, residentId, residentName, req.body);
      res.success(complaint, 'Complaint created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc', search, status, category, priority } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (status && status !== 'All Statuses') filters.status = status;
      if (category) filters.category = category;
      if (priority) filters.priority = priority;

      // RBAC: Residents only see their own complaints, assignees see their assigned/broadcast complaints
      const userRoles = req.user.roles || [];
      const primaryRole = req.user.role || '';
      const isAdmin = userRoles.some(r => ['Admin', 'Community Admin', 'FacilityManager', 'Manager', 'Facility Manager'].includes(r)) || ['Admin', 'Community Admin', 'FacilityManager', 'Manager', 'Facility Manager'].includes(primaryRole);
      
      if (!isAdmin) {
        const userId = req.user.id || req.user._id;
        filters.$or = [
          { residentId: userId },
          { assignedTechnicianId: userId },
          { broadcastTechnicianIds: userId }
        ];
      }

      if (status && status !== 'All Statuses') filters.status = status;
      if (search) {
        filters.$or = filters.$or || [];
        filters.$or.push({ complaintNumber: { $regex: search, $options: 'i' } });
        filters.$or.push({ title: { $regex: search, $options: 'i' } });
      }

      console.log(`[DEBUG GET ALL] req.user:`, req.user, `| orgId:`, orgId, `| filters:`, JSON.stringify(filters));

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const pagination = { skip, limit: parseInt(limit) };
      const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

      const result = await complaintService.getComplaints(orgId, filters, pagination, sort);
      console.log(`[DEBUG GET ALL] found ${result.data.length} records. total: ${result.total}`);
      
      res.success({
        complaints: result.data,
        pagination: {
          totalRecords: result.total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(result.total / parseInt(limit))
        }
      }, 'Complaints retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      let complaint = await complaintService.getComplaintById(id, orgId);
      
      // If technician has no phone in User model, fetch from Technician model
      if (complaint && complaint.assignedTechnicianId && !complaint.assignedTechnicianId.phone) {
        const tech = await Technician.findOne({ userId: complaint.assignedTechnicianId._id });
        if (tech && tech.phone) {
          // Convert to lean object if not already to allow modification
          if (typeof complaint.toObject === 'function') {
            complaint = complaint.toObject();
          }
          complaint.assignedTechnicianId.phone = tech.phone;
          complaint.assignedTechnicianPhone = tech.phone;
        }
      }
      
      res.success(complaint, 'Complaint retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async assignTechnician(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { id } = req.params;
      const { 
        technicianId, technicianIds, assignmentType, technicianName, 
        vendor, team, instructions, preferredVisitDate, 
        preferredVisitTime, reassignmentReason 
      } = req.body;
      const adminId = req.user.id || req.user._id;
      const adminName = req.user.name || `${req.user.firstName} ${req.user.lastName}`;
      const metaData = {
        ipAddress: req.ip,
        browser: req.headers['user-agent'],
        device: 'Web'
      };
      
      const updated = await complaintService.assignTechnician(
        id, orgId, technicianId, technicianIds, assignmentType, technicianName, 
        adminId, adminName, vendor, team, instructions, preferredVisitDate, preferredVisitTime, metaData, reassignmentReason
      );
      res.success(updated, 'Technician assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, remarks, attachments, priority } = req.body;
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      
      // Determine role from user details (Simplified. In reality, check req.user.roles or membership)
      const userRole = req.user.roleName || 'User'; 

      const updated = await complaintService.updateStatus(id, orgId, status, userId, userRole, userName, remarks, attachments, priority);
      res.success(updated, `Complaint status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const { id } = req.params;
      const { remarks, attachments, isInternal } = req.body;
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      const userRole = req.user.roleName || 'User';

      const updated = await complaintService.addComment(id, orgId, userId, userRole, userName, remarks, attachments, isInternal);
      res.success(updated, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboardAnalytics(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const filters = req.query; // { startDate, endDate, category, priority, status, assignedTechnicianId }
      
      const dashboardData = await complaintService.getDashboardAnalytics(orgId, filters);
      res.success(dashboardData, 'Dashboard analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCalendarEvents(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { startDate, endDate } = req.query;
      const events = await complaintService.getCalendarEvents(orgId, startDate, endDate);
      res.success(events, 'Calendar events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async exportComplaints(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const filters = req.query; // Advanced filters including slaStatus
      const complaints = await complaintService.getComplaints(orgId, filters, { limit: 1000, skip: 0 }, { createdAt: -1 });
      
      if (!complaints.data || complaints.data.length === 0) {
        return res.status(404).json({ success: false, message: 'No records found to export' });
      }

      // Convert to Excel
      const xlsx = await import('xlsx');
      
      const excelData = complaints.data.map(c => ({
        'Complaint No': c.complaintNumber || '',
        'Resident': c.residentName || (c.residentId && c.residentId.username) || '',
        'Category': c.category || '',
        'Priority': c.priority || '',
        'Status': c.status || '',
        'SLA Status': c.slaStatus || '',
        'Assigned To': c.assignedTechnicianName || c.vendor || 'Unassigned',
        'Created At': new Date(c.createdAt).toLocaleString()
      }));

      const worksheet = xlsx.utils.json_to_sheet(excelData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Complaints");
      
      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="complaints_export.xlsx"');
      res.status(200).send(excelBuffer);
    } catch (error) {
      next(error);
    }
  }

  async addFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, remarks } = req.body;
      const orgId = req.tenant.orgId;
      
      const updated = await complaintService.addFeedback(id, orgId, rating, remarks);
      res.success(updated, 'Feedback submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const deleted = await complaintService.deleteComplaint(id, orgId);
      res.success(deleted, 'Complaint deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadAttachments(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new HttpError(400, 'No files uploaded');
      }
      
      const fileUrls = req.files.map(file => `/uploads/complaints/${file.filename}`);
      res.success(fileUrls, 'Files uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async acceptAssignment(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const updated = await complaintService.acceptAssignment(req.params.id, req.tenant.orgId, userId, req.user.firstName || req.user.username, req.user.role, metaData);
      res.success(updated, 'Assignment accepted successfully');
    } catch (error) { next(error); }
  }

  async rejectAssignment(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const updated = await complaintService.rejectAssignment(req.params.id, req.tenant.orgId, userId, req.user.firstName || req.user.username, req.user.role, req.body.reason, metaData);
      res.success(updated, 'Assignment rejected successfully');
    } catch (error) { next(error); }
  }

  async startWork(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.startWork(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, metaData);
      res.success(updated, 'Work started successfully');
    } catch (error) { next(error); }
  }

  async pauseWork(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.pauseWork(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, req.body.reason, metaData);
      res.success(updated, 'Work paused successfully');
    } catch (error) { next(error); }
  }

  async resumeWork(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.resumeWork(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, metaData);
      res.success(updated, 'Work resumed successfully');
    } catch (error) { next(error); }
  }

  async markWorkCompleted(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.markWorkCompleted(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, req.body.notes, req.body.attachments, metaData);
      res.success(updated, 'Work completed successfully');
    } catch (error) { next(error); }
  }

  async uploadWorkAttachments(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.uploadWorkAttachments(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, req.body.attachments, metaData);
      res.success(updated, 'Work attachments uploaded successfully');
    } catch (error) { next(error); }
  }

  async addWorkNotes(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.addWorkNotes(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, req.body.notes, metaData);
      res.success(updated, 'Work notes added successfully');
    } catch (error) { next(error); }
  }

  async confirmCompletion(req, res, next) {
    try {
      const { feedback } = req.body;
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const updated = await complaintService.confirmCompletion(req.params.id, req.tenant.orgId, req.user._id, req.user.firstName, req.user.role, metaData, feedback);
      res.success(updated, 'Completion confirmed successfully');
    } catch (error) { next(error); }
  }
}

export default new ComplaintController();
