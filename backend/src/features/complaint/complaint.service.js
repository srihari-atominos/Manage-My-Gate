import complaintRepository from './complaint.repository.js';
import complaintSettingsService from '../complaintSettings/complaintSettings.service.js';
import auditLogService from '../auditLog/auditLog.services.js';
import technicianRepository from '../technician/technician.repository.js';
import { complaintEvents } from './complaint.events.js';
import HttpError from '../../utils/httpError.utils.js';
import mongoose from 'mongoose';
import ComplaintSettings from '../complaintSettings/complaintSettings.model.js';
import visitorPassService from '../visitorPass/visitorPass.service.js';
import { messageBroker } from '../../utils/messageBroker.util.js';

class ComplaintService {
  async generateComplaintNumber(orgId) {
    const settings = await complaintSettingsService.getSettings(orgId);
    const prefix = settings?.ticketFormat?.prefix || 'CMP';
    const includeYear = settings?.ticketFormat?.includeYear !== false;
    const seqLength = settings?.ticketFormat?.sequenceLength || 6;
    
    const lastComplaint = await complaintRepository.findAll(orgId, {}, { skip: 0, limit: 1 }, { createdAt: -1 });
    let nextNum = 1;
    if (lastComplaint.data.length > 0) {
      const lastComplaintNumber = lastComplaint.data[0].complaintNumber;
      const parts = lastComplaintNumber.split('-');
      const lastNumStr = parts[parts.length - 1];
      nextNum = parseInt(lastNumStr, 10) + 1;
      if (isNaN(nextNum)) nextNum = lastComplaint.total + 1;
    }
    
    const year = includeYear ? `-${new Date().getFullYear()}-` : '-';
    return `${prefix}${year}${String(nextNum).padStart(seqLength, '0')}`;
  }

  async calculateSLADueDate(orgId, priority) {
    const settings = await complaintSettingsService.getSettings(orgId);
    const rule = settings?.slaRules?.find(r => r.priority === priority);
    const resolveHours = rule ? rule.resolveWithinHours : 24; // Default to 24h
    
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + resolveHours);
    return dueDate;
  }

  async createComplaint(orgId, residentId, residentName, data, metaData = {}) {
    if (!orgId || !residentId) throw new HttpError(400, 'Missing required orgId or residentId');

    // Duplicate Prevention Engine
    const duplicateWindowMs = 60 * 60 * 1000 * 24; // Check within last 24 hours
    const recentComplaints = await complaintRepository.findAll(orgId, {
      residentId,
      category: data.category,
      title: data.title,
      'location.flat': data.location?.flat,
      createdAt: { $gte: new Date(Date.now() - duplicateWindowMs) },
      status: { $in: ['Open', 'In Progress', 'Assigned', 'Escalated'] } // Only active tickets
    }, { skip: 0, limit: 1 }, {});
    
    const duplicateTicket = recentComplaints.data[0];
    if (duplicateTicket && !data.ignoreDuplicateWarning) {
      throw new HttpError(409, 'Possible duplicate complaint found. Do you still want to continue?', { duplicateTicket });
    }

    // Smart Anti-Spam (Fuzzy Matching)
    const fuzzyDuplicates = await complaintRepository.findFuzzyDuplicates(orgId, residentId, data.title);
    if (fuzzyDuplicates.length > 0 && !data.ignoreDuplicateWarning) {
      throw new HttpError(409, 'A similar complaint was recently submitted (Spam Prevention).', { duplicateTicket: fuzzyDuplicates[0] });
    }

    const complaintNumber = await this.generateComplaintNumber(orgId);
    
    // Emergency Handling
    let priority = data.priority || 'Medium';
    if (data.isEmergency) {
      priority = 'Critical';
    }
    
    const slaDueDate = await this.calculateSLADueDate(orgId, priority);
    
    // Auto-map department (placeholder for dynamic config lookup)
    const department = data.department || 'General Maintenance';

    const newComplaint = {
      orgId,
      residentId,
      residentName,
      residentEmail: data.residentEmail,
      residentMobile: data.residentMobile,
      complaintNumber,
      slaDueDate,
      expectedSLA: priority === 'Critical' ? 'Immediate' : 'Standard',
      ...data,
      priority,
      department,
      status: 'Open',
      workflowStatus: 'Waiting For Assignment',
      createdBy: residentId,
      timeline: [
        {
          status: 'Open',
          action: 'Ticket Created',
          userId: residentId,
          userRole: 'Resident',
          userName: residentName,
          remarks: 'Complaint ticket initiated.',
          ipAddress: metaData.ipAddress,
          browser: metaData.browser,
          device: metaData.device
        },
        {
          status: 'Open',
          action: 'Complaint Submitted',
          userId: residentId,
          userRole: 'Resident',
          userName: residentName,
          remarks: 'Complaint submitted by resident.',
          ipAddress: metaData.ipAddress,
          browser: metaData.browser,
          device: metaData.device
        },
        {
          status: 'Waiting For Assignment',
          action: 'Waiting For Assignment',
          userId: residentId,
          userRole: 'System',
          userName: 'System',
          remarks: 'Complaint is waiting for technician assignment.',
          ipAddress: metaData.ipAddress,
          browser: metaData.browser,
          device: metaData.device
        }
      ]
    };

    const complaint = await complaintRepository.create(newComplaint);
    
    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId,
        action: 'Complaint Created',
        module: 'Complaints',
        targetId: complaint._id,
        targetName: complaintNumber,
        userId: residentId,
        userRole: 'Resident',
        ipAddress: metaData.ipAddress,
        browser: metaData.browser,
        device: metaData.device,
        details: { category: data.category, priority }
      }).catch(err => console.error('Audit Log failed:', err));
    }
    
    // Increment usage count for suggested issues
    if (data.category && data.title) {
      try {
        await ComplaintSettings.updateOne(
          { orgId, 'categories.name': data.category, 'categories.suggestedIssues.name': data.title },
          { 
            $inc: { 'categories.$[cat].suggestedIssues.$[issue].usageCount': 1 },
            $set: { 'categories.$[cat].suggestedIssues.$[issue].lastUsedDate': new Date() }
          },
          { arrayFilters: [{ 'cat.name': data.category }, { 'issue.name': data.title }] }
        );
      } catch (err) {
        console.error('Failed to increment suggested issue usage count:', err);
      }
    }
    
    complaintEvents.emit('complaint.created', { orgId, complaint });
    return complaint;
  }

  calculateActiveSLA(complaint) {
    if (!complaint.slaDueDate || !complaint.statusHistory || complaint.statusHistory.length === 0) {
      return complaint.slaDueDate;
    }
    
    let totalHoldMs = 0;
    let holdStartTime = null;

    for (const history of complaint.statusHistory) {
      if (history.status === 'On Hold') {
        if (!holdStartTime) holdStartTime = new Date(history.timestamp);
      } else {
        if (holdStartTime) {
          totalHoldMs += (new Date(history.timestamp) - holdStartTime);
          holdStartTime = null;
        }
      }
    }

    if (holdStartTime && !['Closed', 'Completed', 'Resolved', 'Cancelled'].includes(complaint.status)) {
      totalHoldMs += (new Date() - holdStartTime);
    }

    return new Date(new Date(complaint.slaDueDate).getTime() + totalHoldMs);
  }

  calculateSLAStatus(complaint) {
    let slaStatus = 'Within SLA';
    const effectiveSlaDueDate = this.calculateActiveSLA(complaint);
    
    if (complaint.escalationLevel > 0) {
      slaStatus = 'Escalated';
    } else if (effectiveSlaDueDate && !['Closed', 'Completed', 'Resolved'].includes(complaint.status)) {
      const now = new Date();
      const due = new Date(effectiveSlaDueDate);
      const diffMs = due - now;
      if (diffMs < 0) {
        slaStatus = 'SLA Breached';
      } else if (diffMs < 2 * 60 * 60 * 1000) { // 2 hours
        slaStatus = 'Near SLA';
      }
    } else if (['Closed', 'Completed', 'Resolved'].includes(complaint.status)) {
       if (complaint.resolvedAt && effectiveSlaDueDate && complaint.resolvedAt > effectiveSlaDueDate) {
          slaStatus = 'SLA Breached';
       } else {
          slaStatus = 'Within SLA';
       }
    }
    const obj = complaint.toObject ? complaint.toObject() : complaint;
    return { ...obj, slaStatus, effectiveSlaDueDate };
  }

  async getComplaints(orgId, filters, pagination, sort) {
    const dbFilters = { ...filters };
    
    // Advanced SLA Filter Mapping
    if (dbFilters.slaStatus) {
      const now = new Date();
      const nearThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const closedStatuses = ['Closed', 'Completed', 'Resolved'];
      
      switch (dbFilters.slaStatus) {
        case 'Escalated':
          dbFilters.escalationLevel = { $gt: 0 };
          break;
        case 'SLA Breached':
          dbFilters.$or = [
            { slaDueDate: { $lt: now }, status: { $nin: closedStatuses } },
            { status: { $in: closedStatuses }, $expr: { $gt: ['$resolvedAt', '$slaDueDate'] } }
          ];
          break;
        case 'Near SLA':
          dbFilters.slaDueDate = { $gte: now, $lt: nearThreshold };
          dbFilters.status = { $nin: closedStatuses };
          dbFilters.escalationLevel = 0;
          break;
        case 'Within SLA':
          dbFilters.slaDueDate = { $gte: nearThreshold };
          dbFilters.status = { $nin: closedStatuses };
          dbFilters.escalationLevel = 0;
          break;
      }
      delete dbFilters.slaStatus;
    }
    
    // Resident search
    if (dbFilters.residentName) {
      dbFilters.residentName = { $regex: dbFilters.residentName, $options: 'i' };
    }
    // Complaint Number search
    if (dbFilters.complaintNumber) {
      dbFilters.complaintNumber = { $regex: dbFilters.complaintNumber, $options: 'i' };
    }
    
    const result = await complaintRepository.findAll(orgId, dbFilters, pagination, sort);
    if (result.data) {
      result.data = result.data.map(c => this.calculateSLAStatus(c));
    }
    return result;
  }

  async getComplaintById(id, orgId) {
    const complaint = await complaintRepository.findById(id, orgId);
    if (!complaint) throw new HttpError(404, 'Complaint not found');
    return this.calculateSLAStatus(complaint);
  }

  async assignTechnician(id, orgId, technicianId, technicianIds, assignmentType, technicianName, adminId, adminName, vendor, team, adminInstructions, preferredVisitDate, preferredVisitTime, metaData = {}, reassignmentReason = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    let updated, vendorPass = null;
    let isReassignment, previousAssigneeName;
    
    try {
      const complaint = await this.getComplaintById(id, orgId);
      if (!complaint) throw new HttpError(404, 'Complaint not found');

      if (['Closed', 'Completed', 'Resolved', 'Cancelled'].includes(complaint.status)) {
        throw new HttpError(400, `Cannot assign a ${complaint.status.toLowerCase()} complaint`);
      }

      const isBroadcast = assignmentType === 'broadcast';

      if (isBroadcast) {
        if (!technicianIds || technicianIds.length === 0) throw new HttpError(400, 'Must select at least one technician for broadcast');
      } else if (assignmentType === 'vendor') {
        if (!technicianName && !vendor) throw new HttpError(400, 'Vendor name is required');
      } else {
        if (!technicianId) throw new HttpError(400, 'Technician is required for direct assignment');
        const technician = await technicianRepository.findById(technicianId, orgId);
        if (!technician) throw new HttpError(404, 'Technician not found');
        if (technician.status !== 'Active') throw new HttpError(400, 'Technician is inactive');
      }

      isReassignment = !!complaint.assignedTechnicianId || !!complaint.vendor;
      previousAssigneeName = complaint.assignedTechnicianName || complaint.vendor || 'Unassigned';

      let targetStatus = isBroadcast ? 'Waiting For Acceptance' : 'Assigned';
      if (assignmentType === 'vendor') targetStatus = 'Assigned';

      const timelineEvent = {
        status: targetStatus,
        action: isReassignment ? 'Complaint Reassigned' : (isBroadcast ? 'Broadcast Assignment Requested' : 'Complaint Assigned'),
        userId: adminId,
        userRole: 'Admin',
        userName: adminName,
        remarks: isBroadcast 
          ? `Broadcast assignment requested to multiple technicians. ${adminInstructions ? `Instructions: ${adminInstructions}` : ''}`
          : `Assigned to: ${technicianName || vendor}. ${adminInstructions ? `Instructions: ${adminInstructions}` : ''}`,
        date: new Date(),
        ipAddress: metaData.ipAddress,
        browser: metaData.browser,
        device: metaData.device
      };

      let targetUserId = null;
      let targetBroadcastUserIds = [];
      let targetPhone = null;

      if (isBroadcast) {
        if (technicianIds && technicianIds.length > 0) {
          const technicians = await technicianRepository.findAll(orgId, { _id: { $in: technicianIds } });
          targetBroadcastUserIds = technicians.map(t => t.userId).filter(id => id);
        }
      } else if (technicianId) {
        const technician = await technicianRepository.findById(technicianId, orgId);
        targetUserId = technician.userId || null;
        targetPhone = technician.phone || null;
      }

      const updateFields = {
        assignedTechnicianId: isBroadcast ? null : targetUserId,
        assignedTechnicianName: isBroadcast ? null : (technicianName || null),
        assignedTechnicianPhone: isBroadcast ? null : targetPhone,
        vendor: isBroadcast ? null : (vendor || null),
        team: team || null,
        assignedBy: adminId,
        assignedAt: new Date(),
        status: targetStatus,
        isBroadcast,
        broadcastTechnicianIds: isBroadcast ? targetBroadcastUserIds : [],
        $push: { timeline: timelineEvent }
      };
      if (preferredVisitDate) updateFields.preferredVisitDate = preferredVisitDate;
      if (preferredVisitTime) updateFields.preferredVisitTime = preferredVisitTime;

      updated = await complaintRepository.update(id, orgId, updateFields, session);

      // Revoke any existing active/pending Vendor Passes for this complaint
      const existingPass = await mongoose.model('VisitorPass').findOne({ 
        linkedComplaintId: id, 
        status: { $in: ['PENDING', 'ACTIVE'] } 
      }).session(session);
      
      if (existingPass) {
        await visitorPassService.revokePass(existingPass._id, session);
      }

      // Create new pass if Vendor assignment
      if (assignmentType === 'vendor') {
        const startDate = new Date();
        const endDate = preferredVisitDate ? new Date(preferredVisitDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const passData = {
          orgId,
          createdById: adminId,
          passType: 'SERVICE',
          status: 'PENDING',
          linkedComplaintId: id,
          visitorDetails: {
            name: technicianName || vendor || 'Temporary Vendor',
          },
          validity: {
            startDate,
            endDate,
            timeWindowStart: '00:00',
            timeWindowEnd: '23:59',
          },
          usageLimit: {
            maxUses: 1,
            currentUses: 0
          }
        };

        vendorPass = await visitorPassService.createPass(passData, session);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Side Effects after commit
    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId,
        action: isReassignment ? 'Complaint Reassigned' : 'Complaint Assigned',
        module: 'Complaints',
        targetId: updated._id,
        targetName: updated.complaintNumber,
        userId: adminId,
        userRole: 'Admin',
        ipAddress: metaData.ipAddress,
        browser: metaData.browser,
        device: metaData.device,
        details: isReassignment ? {
          previousAssignee: previousAssigneeName,
          newAssignee: technicianName || vendor,
          reason: reassignmentReason
        } : { technicianName, vendor }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit(isReassignment ? 'complaint.reassigned' : 'complaint.assigned', { orgId, complaint: updated, adminId, previousAssigneeName });

    if (vendorPass) {
      messageBroker.publishEvent('VISITOR_PASS_CREATED', { pass: vendorPass, orgId });
    }

    return { complaint: updated, vendorPass };
  }

  async escalateComplaint(id, orgId, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    if (!complaint) throw new HttpError(404, 'Complaint not found');

    if (['Closed', 'Completed', 'Resolved', 'Cancelled'].includes(complaint.status)) {
      return complaint; // Already closed, cannot escalate
    }

    const newLevel = (complaint.escalationLevel || 0) + 1;

    const timelineEvent = {
      status: 'Escalated',
      action: 'Complaint Escalated',
      userId: null,
      userRole: 'System',
      userName: 'System',
      remarks: `Complaint automatically escalated due to SLA breach. Level: ${newLevel}`,
      date: new Date(),
      ipAddress: metaData.ipAddress,
      browser: metaData.browser,
      device: metaData.device
    };

    const updateFields = {
      escalationLevel: newLevel,
      status: 'Escalated', // Status overrides if needed, or keeps current status but sets escalationLevel
      $push: { timeline: timelineEvent }
    };

    const updated = await complaintRepository.update(id, orgId, updateFields);

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId,
        action: 'Complaint Escalated',
        module: 'Complaints',
        targetId: updated._id,
        targetName: updated.complaintNumber,
        userId: null,
        userRole: 'System',
        details: { escalationLevel: newLevel }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.escalated', { orgId, complaint: updated, newLevel });
    return updated;
  }

  async acceptAssignment(id, orgId, userId, userName, userRole, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    
    if (complaint.isBroadcast) {
      if (complaint.assignedTechnicianId) {
        throw new HttpError(400, 'This complaint has already been accepted by another technician.');
      }
      const uidStr = userId ? userId.toString() : '';
      if (!complaint.broadcastTechnicianIds.some(id => id && id.toString() === uidStr)) {
        throw new HttpError(403, 'You were not offered this assignment.');
      }
    } else {
      if (String(complaint.assignedTechnicianId) !== String(userId)) {
        throw new HttpError(403, 'You are not assigned to this complaint');
      }
    }
    
    const timelineEvent = {
      status: 'Assigned',
      action: 'Assignment Accepted',
      userId, userRole, userName,
      remarks: 'Technician has accepted the assignment.',
      date: new Date()
    };

    const previousBroadcastIds = complaint.broadcastTechnicianIds || [];

    let updated;
    if (complaint.isBroadcast) {
      updated = await complaintRepository.acceptAssignmentAtomic(id, orgId, userId, userName, timelineEvent);
      if (!updated) {
        throw new HttpError(409, 'This ticket has already been accepted by another technician (Conflict).');
      }
    } else {
      const updateFields = {
        status: 'Assigned',
        assignedTechnicianId: userId,
        assignedTechnicianName: userName,
        isBroadcast: false,
        broadcastTechnicianIds: [],
        $push: { 
          statusHistory: { status: 'Assigned', timestamp: new Date() },
          timeline: timelineEvent 
        }
      };
      updated = await complaintRepository.update(id, orgId, updateFields);
    }

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Accept Assignment', module: 'Complaints',
        targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress,
        browser: metaData.browser, device: metaData.device,
        details: { previousStatus: complaint.status, newStatus: 'Assigned' }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.updated', { 
      orgId, 
      complaint: updated, 
      action: 'Assignment Accepted',
      previousBroadcastIds,
      acceptedById: userId
    });
    return updated;
  }

  async rejectAssignment(id, orgId, userId, userName, userRole, reason, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    
    const isDirectAssignee = complaint.assignedTechnicianId && String(complaint.assignedTechnicianId) === String(userId);
    const isBroadcastAssignee = complaint.isBroadcast && complaint.broadcastTechnicianIds && complaint.broadcastTechnicianIds.some(tid => String(tid) === String(userId));

    if (!isDirectAssignee && !isBroadcastAssignee) {
      throw new HttpError(403, 'You are not assigned to this complaint');
    }

    const timelineEvent = {
      status: 'Waiting For Assignment',
      action: 'Assignment Rejected',
      userId, userRole, userName,
      remarks: `Assignment rejected. Reason: ${reason}`,
      date: new Date()
    };

    let updated;

    if (isBroadcastAssignee) {
      // Remove from broadcast list
      const updatedBroadcastList = complaint.broadcastTechnicianIds.filter(tid => String(tid) !== String(userId));
      const isListEmpty = updatedBroadcastList.length === 0;
      
      if (isListEmpty) timelineEvent.remarks += ' (All broadcast assignees rejected)';

      updated = await complaintRepository.update(id, orgId, {
        status: isListEmpty ? 'Waiting For Assignment' : 'Waiting For Acceptance',
        broadcastTechnicianIds: updatedBroadcastList,
        isBroadcast: isListEmpty ? false : true,
        $push: { timeline: timelineEvent }
      });
    } else {
      // Direct rejection
      updated = await complaintRepository.update(id, orgId, {
        status: 'Waiting For Assignment',
        assignedTechnicianId: null,
        assignedTechnicianName: null,
        vendor: null,
        $push: { timeline: timelineEvent }
      });
    }

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Reject Assignment', module: 'Complaints',
        targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress,
        browser: metaData.browser, device: metaData.device,
        details: { reason, previousStatus: complaint.status, newStatus: 'Waiting For Assignment' }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Assignment Rejected' });
    return updated;
  }

  async startWork(id, orgId, userId, userName, userRole, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    const timelineEvent = {
      status: 'In Progress',
      action: 'Work Started',
      userId, userRole, userName,
      remarks: 'Work has started.',
      date: new Date()
    };
    const updated = await complaintRepository.update(id, orgId, {
      status: 'In Progress',
      $push: { timeline: timelineEvent }
    });
    
    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Start Work', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { previousStatus: complaint.status, newStatus: 'In Progress' }
      }).catch(err => console.error('Audit Log failed:', err));
    }
    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Work Started' });
    return updated;
  }

  async pauseWork(id, orgId, userId, userName, userRole, reason, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    const timelineEvent = {
      status: 'On Hold',
      action: 'Work Paused',
      userId, userRole, userName,
      remarks: `Work paused. Reason: ${reason}`,
      date: new Date()
    };
    const updated = await complaintRepository.update(id, orgId, {
      status: 'On Hold',
      $push: { timeline: timelineEvent }
    });

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Pause Work', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { reason, previousStatus: complaint.status, newStatus: 'On Hold' }
      }).catch(err => console.error('Audit Log failed:', err));
    }
    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Work Paused' });
    return updated;
  }

  async resumeWork(id, orgId, userId, userName, userRole, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    const timelineEvent = {
      status: 'In Progress',
      action: 'Work Resumed',
      userId, userRole, userName,
      remarks: 'Work resumed.',
      date: new Date()
    };
    const updated = await complaintRepository.update(id, orgId, {
      status: 'In Progress',
      $push: { timeline: timelineEvent }
    });

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Resume Work', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { previousStatus: complaint.status, newStatus: 'In Progress' }
      }).catch(err => console.error('Audit Log failed:', err));
    }
    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Work Resumed' });
    return updated;
  }

  async markWorkCompleted(id, orgId, userId, userName, userRole, notes, attachments = [], metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    
    const timelineEvent = {
      status: 'Closed',
      action: 'Work Completed',
      userId, userRole, userName,
      remarks: notes || 'Work has been marked as completed by the assignee.',
      attachments,
      date: new Date()
    };

    const updated = await complaintRepository.update(id, orgId, {
      $set: { status: 'Closed', resolvedAt: new Date(), completionDate: new Date() },
      $push: { timeline: timelineEvent }
    });

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Complete Work', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { notes, attachments, previousStatus: complaint.status, newStatus: 'Closed' }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Work Completed' });
    return updated;
  }

  async uploadWorkAttachments(id, orgId, userId, userName, userRole, attachments, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    const timelineEvent = {
      status: complaint.status,
      action: 'Work Photos Uploaded',
      userId, userRole, userName,
      remarks: 'Assignee uploaded work photos/documents.',
      attachments,
      date: new Date()
    };
    const updated = await complaintRepository.update(id, orgId, {
      $push: { timeline: timelineEvent }
    });

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Upload Work Photos', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { attachments }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Work Photos Uploaded' });
    return updated;
  }

  async addWorkNotes(id, orgId, userId, userName, userRole, notes, metaData = {}) {
    const complaint = await this.getComplaintById(id, orgId);
    const timelineEvent = {
      status: complaint.status,
      action: 'Notes Added',
      userId, userRole, userName,
      remarks: notes,
      date: new Date()
    };
    const updated = await complaintRepository.update(id, orgId, {
      $push: { timeline: timelineEvent }
    });

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Add Notes', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { notes }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Notes Added' });
    return updated;
  }

  async confirmCompletion(id, orgId, userId, userName, userRole, metaData = {}, feedback = null) {
    const complaint = await this.getComplaintById(id, orgId);
    
    // Support rework logic if requested by resident (e.g. if feedback explicitly rejects work)
    // For now, Resident Confirmation moves to Closed, as per typical flow.
    const timelineEvents = [
      {
        status: 'Closed',
        action: 'Resident Confirmed',
        userId, userRole, userName,
        remarks: feedback ? 'Resident confirmed the completion of work and submitted feedback.' : 'Resident confirmed the completion of work.',
        date: new Date()
      },
      {
        status: 'Closed',
        action: 'Complaint Closed',
        userId, userRole, userName,
        remarks: 'Complaint has been closed following resident confirmation.',
        date: new Date()
      }
    ];

    const updateData = {
      status: 'Closed',
      closedAt: new Date(),
      $push: { timeline: { $each: timelineEvents } }
    };
    
    if (feedback) {
      updateData.feedback = {
        ...feedback,
        feedbackDate: new Date()
      };
    }

    const updated = await complaintRepository.update(id, orgId, updateData);

    if (auditLogService && auditLogService.logAction) {
      await auditLogService.logAction({
        orgId, action: 'Resident Confirmation', module: 'Complaints', targetId: id, targetName: complaint.complaintNumber,
        userId, userRole, ipAddress: metaData.ipAddress, browser: metaData.browser, device: metaData.device,
        details: { previousStatus: complaint.status, newStatus: 'Closed' }
      }).catch(err => console.error('Audit Log failed:', err));
    }

    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Resident Confirmed' });
    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Complaint Closed' });
    return updated;
  }

  async updateStatus(id, orgId, status, userId, userRole, userName, remarks, attachments = [], priority) {
    const complaint = await this.getComplaintById(id, orgId);
    
    let extraData = {};
    const terminalStatuses = ['Resolved', 'Closed', 'Completed', 'Work Completed'];
    if (terminalStatuses.includes(status)) {
      extraData.resolvedAt = new Date();
    }
    
    if (status === 'Closed' || status === 'Completed') {
      extraData.closedAt = new Date();
    }

    if (priority) {
      extraData.priority = priority;
    }

    const timelineEvent = {
      status,
      action: `Status updated to ${status}`,
      userId,
      userRole,
      userName,
      remarks,
      attachments
    };

    const updated = await complaintRepository.update(id, orgId, {
      status,
      ...extraData,
      $push: { timeline: timelineEvent }
    });

    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: status });
    return updated;
  }

  async addComment(id, orgId, userId, userRole, userName, remarks, attachments = [], isInternal = false) {
    const complaint = await this.getComplaintById(id, orgId);
    
    const timelineEvent = {
      status: complaint.status,
      action: 'Comment Added',
      userId,
      userRole,
      userName,
      remarks,
      attachments,
      isInternal
    };

    const updated = await complaintRepository.addTimelineEvent(id, orgId, timelineEvent);
    complaintEvents.emit('complaint.commentAdded', { orgId, complaint: updated });
    return updated;
  }

  async getDashboardAnalytics(orgId, filters = {}) {
    // Process filters like date range if provided
    const matchFilters = {};
    
    if (filters.startDate || filters.endDate) {
      matchFilters.createdAt = {};
      if (filters.startDate) matchFilters.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchFilters.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters.category) matchFilters.category = filters.category;
    if (filters.priority) matchFilters.priority = filters.priority;
    if (filters.status) matchFilters.status = filters.status;
    if (filters.assignedTechnicianId) matchFilters.assignedTechnicianId = filters.assignedTechnicianId;

    return await complaintRepository.getDashboardAnalytics(orgId, matchFilters);
  }
  async getCalendarEvents(orgId, startDate, endDate) {
    if (!startDate || !endDate) {
      // Default to current month if not provided
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    return await complaintRepository.getCalendarEvents(orgId, new Date(startDate), new Date(endDate));
  }

  async addFeedback(id, orgId, rating, remarks) {
    const complaint = await this.getComplaintById(id, orgId);
    if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
      throw new HttpError(400, 'Cannot rate an unresolved complaint');
    }
    const updated = await complaintRepository.update(id, orgId, {
      feedback: { overallRating: rating, remarks },
      status: 'Closed',
      closedAt: new Date()
    });
    complaintEvents.emit('complaint.updated', { orgId, complaint: updated, action: 'Feedback Added' });
    return updated;
  }

  async deleteComplaint(id, orgId) {
    const complaint = await this.getComplaintById(id, orgId);
    const deleted = await complaintRepository.update(id, orgId, { status: 'Cancelled' });
    complaintEvents.emit('complaint.updated', { orgId, complaint: deleted, action: 'Deleted' });
    return deleted;
  }
}

export default new ComplaintService();
