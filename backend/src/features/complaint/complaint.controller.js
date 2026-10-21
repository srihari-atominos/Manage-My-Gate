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
        const userEmail = req.user.email || '';
        const userPhone = req.user.phone || '';
        const userName = req.user.name || req.user.username || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();

        let techIds = [];
        try {
          const Technician = (await import('../technician/technician.model.js')).default;
          const techDocs = await Technician.find({
            orgId,
            $or: [
              { userId },
              ...(userEmail ? [{ email: userEmail.toLowerCase() }] : []),
              ...(userPhone ? [{ phone: userPhone }] : [])
            ]
          });
          techIds = techDocs.map(t => t._id);
        } catch (err) {}

        const allTargetIds = Array.from(new Set([userId, ...techIds].map(id => String(id))));

        filters.$or = [
          { residentId: userId },
          { assignedTechnicianId: { $in: allTargetIds } },
          { broadcastTechnicianIds: { $in: allTargetIds } },
          ...(userName ? [{ assignedTechnicianName: new RegExp(`^${userName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }] : [])
        ];
      }

      if (status && status !== 'All Statuses') filters.status = status;
      if (search) {
        filters.search = search;
      }

      console.log(`[DEBUG GET ALL] req.user:`, req.user, `| orgId:`, orgId, `| filters:`, JSON.stringify(filters));

      const safeLimit = Math.max(1, parseInt(limit) || 10);
      const safePage = Math.max(1, parseInt(page) || 1);
      const skip = (safePage - 1) * safeLimit;
      const pagination = { skip, limit: safeLimit };
      const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

      const result = await complaintService.getComplaints(orgId, filters, pagination, sort);
      console.log(`[DEBUG GET ALL] found ${result.data.length} records. total: ${result.total}`);
      
      res.success({
        complaints: result.data,
        pagination: {
          totalRecords: result.total,
          currentPage: safePage,
          totalPages: Math.max(1, Math.ceil((result.total || 0) / safeLimit))
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
        vendor, team, instructions, adminInstructions, preferredVisitDate, 
        preferredVisitTime, reassignmentReason 
      } = req.body;
      const finalInstructions = adminInstructions || instructions;
      const adminId = req.user.id || req.user._id;
      const rawName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      const adminName = req.user.name || (rawName.length > 0 ? rawName : (req.user.username || req.user.email?.split('@')[0] || 'Admin'));
      const metaData = {
        ipAddress: req.ip,
        browser: req.headers['user-agent'],
        device: 'Web'
      };
      
      const result = await complaintService.assignTechnician(
        id, orgId, technicianId, technicianIds, assignmentType, technicianName, 
        adminId, adminName, vendor, team, finalInstructions, preferredVisitDate, preferredVisitTime, metaData, reassignmentReason
      );
      res.success({ complaint: result.complaint, vendorPass: result.vendorPass }, 'Technician assigned successfully');
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
      const rawName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      const userName = req.user.name || (rawName.length > 0 ? rawName : (req.user.username || req.user.email?.split('@')[0] || 'User'));
      
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
      const filters = { ...(req.query || {}) }; // Advanced filters including slaStatus

      // RBAC: Residents only export their own complaints
      const userRoles = req.user?.roles || [];
      const primaryRole = req.user?.role || '';
      const isAdmin = userRoles.some(r => ['Admin', 'Community Admin', 'FacilityManager', 'Manager', 'Facility Manager'].includes(r)) || ['Admin', 'Community Admin', 'FacilityManager', 'Manager', 'Facility Manager'].includes(primaryRole);
      
      if (!isAdmin) {
        const userId = req.user?.id || req.user?._id;
        filters.residentId = userId;
      }

      const complaints = await complaintService.getComplaints(orgId, filters, { limit: 1000, skip: 0 }, { createdAt: -1 });
      
      if (!complaints.data || complaints.data.length === 0) {
        return res.status(404).json({ success: false, message: 'No records found to export' });
      }

      // Convert to Excel using ExcelJS (secure, prototype pollution free)
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Complaints');

      worksheet.columns = [
        { header: 'Complaint No', key: 'complaintNumber', width: 18 },
        { header: 'Resident', key: 'resident', width: 22 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'SLA Status', key: 'slaStatus', width: 14 },
        { header: 'Assigned To', key: 'assignedTo', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 22 },
      ];

      complaints.data.forEach((c) => {
        worksheet.addRow({
          complaintNumber: c.complaintNumber || '',
          resident: c.residentName || (c.residentId && c.residentId.username) || '',
          category: c.category || '',
          priority: c.priority || '',
          status: c.status || '',
          slaStatus: c.slaStatus || '',
          assignedTo: c.assignedTechnicianName || c.vendor || 'Unassigned',
          createdAt: new Date(c.createdAt).toLocaleString(),
        });
      });

      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="complaints_export.xlsx"');
      res.status(200).send(Buffer.from(excelBuffer));
    } catch (error) {
      next(error);
    }
  }

  async addFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, remarks } = req.body;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };

      const updated = await complaintService.addFeedback(id, orgId, userId, userName, userRole, rating, remarks, metaData);
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
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.startWork(req.params.id, req.tenant.orgId, userId, userName, userRole, metaData);
      res.success(updated, 'Work started successfully');
    } catch (error) { next(error); }
  }

  async pauseWork(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.pauseWork(req.params.id, req.tenant.orgId, userId, userName, userRole, req.body.reason, metaData);
      res.success(updated, 'Work paused successfully');
    } catch (error) { next(error); }
  }

  async resumeWork(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.resumeWork(req.params.id, req.tenant.orgId, userId, userName, userRole, metaData);
      res.success(updated, 'Work resumed successfully');
    } catch (error) { next(error); }
  }

  async markWorkCompleted(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.markWorkCompleted(req.params.id, req.tenant.orgId, userId, userName, userRole, req.body.notes, req.body.attachments, metaData);
      res.success(updated, 'Work completed successfully');
    } catch (error) { next(error); }
  }

  async uploadWorkAttachments(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.uploadWorkAttachments(req.params.id, req.tenant.orgId, userId, userName, userRole, req.body.attachments, metaData);
      res.success(updated, 'Work attachments uploaded successfully');
    } catch (error) { next(error); }
  }

  async addWorkNotes(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.addWorkNotes(req.params.id, req.tenant.orgId, userId, userName, userRole, req.body.notes, metaData);
      res.success(updated, 'Work notes added successfully');
    } catch (error) { next(error); }
  }

  async reopen(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.reopenComplaint(req.params.id, req.tenant.orgId, userId, userName, userRole, req.body.reason, metaData);
      res.success(updated, 'Complaint reopened. The assigned employee has been notified.');
    } catch (error) { next(error); }
  }

  async cancel(req, res, next) {
    try {
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.cancelComplaint(req.params.id, req.tenant.orgId, userId, userName, userRole, req.body?.reason, metaData);
      res.success(updated, 'Complaint cancelled');
    } catch (error) { next(error); }
  }

  async confirmCompletion(req, res, next) {
    try {
      // The mobile app posts the rating fields at the top level; accept both shapes (the service keeps only known fields).
      const feedback = req.body?.feedback || req.body;
      const metaData = { ipAddress: req.ip, browser: req.headers['user-agent'], device: 'Web' };
      const userId = req.user.id || req.user._id;
      const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'User';
      const userRole = req.user.roleName || req.user.role || 'User';
      const updated = await complaintService.confirmCompletion(req.params.id, req.tenant.orgId, userId, userName, userRole, metaData, feedback);
      res.success(updated, 'Completion confirmed successfully');
    } catch (error) { next(error); }
  }
}

export default new ComplaintController();
