import { complaintEvents } from './complaint.events.js';
import { complaintSettingsEvents } from '../complaintSettings/complaintSettings.service.js';
import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

export const initComplaintSockets = () => {
  try {
    complaintEvents.on('complaint.created', ({ orgId, complaint }) => {
      const io = getIO();
      if (io) {
        io.to(`org:${orgId}:role:admin`).emit('complaint_created', complaint);
        io.to(`org:${orgId}:role:facilitymanager`).emit('complaint_created', complaint);
        io.to(`user:${complaint.residentId}`).emit('complaint_created', complaint);
      }
    });

    complaintEvents.on('complaint.assigned', ({ orgId, complaint, adminId, previousAssigneeName }) => {
      const io = getIO();
      if (io) {
        io.to(`org:${orgId}:role:admin`).emit('complaint_assigned', complaint);
        io.to(`org:${orgId}:role:facilitymanager`).emit('complaint_assigned', complaint);
        io.to(`user:${complaint.residentId}`).emit('complaint_assigned', complaint);
        
        if (complaint.isBroadcast && complaint.broadcastTechnicianIds) {
          complaint.broadcastTechnicianIds.forEach(techId => {
            io.to(`user:${techId}`).emit('complaint_assigned', complaint);
          });
        } else if (complaint.assignedTechnicianId) {
          io.to(`user:${complaint.assignedTechnicianId}`).emit('complaint_assigned', complaint);
        }
      }
    });

    complaintEvents.on('complaint.updated', ({ orgId, complaint, action, previousBroadcastIds }) => {
      const io = getIO();
      if (io) {
        let eventName = 'complaint_updated';
        if (action === 'Waiting For Acceptance') eventName = 'complaint_assigned';
        if (action === 'Assignment Accepted') eventName = 'complaint_updated';
        if (action === 'Work Started') eventName = 'complaint_started';
        if (action === 'Work Completed') eventName = 'complaint_completed';
        if (action === 'Resident Confirmed') eventName = 'complaint_completed';
        if (action === 'Complaint Closed') eventName = 'complaint_closed';

        // Emit specific event
        io.to(`org:${orgId}:role:admin`).emit(eventName, complaint);
        io.to(`org:${orgId}:role:facilitymanager`).emit(eventName, complaint);
        io.to(`user:${complaint.residentId}`).emit(eventName, complaint);
        if (complaint.assignedTechnicianId) {
          io.to(`user:${complaint.assignedTechnicianId}`).emit(eventName, complaint);
        }
        if (previousBroadcastIds && previousBroadcastIds.length > 0) {
          previousBroadcastIds.forEach(techId => {
            io.to(`user:${techId}`).emit(eventName, complaint);
            io.to(`user:${techId}`).emit('complaint_updated', complaint);
          });
        }
        if (complaint.broadcastTechnicianIds && complaint.broadcastTechnicianIds.length > 0) {
          complaint.broadcastTechnicianIds.forEach(techId => {
            io.to(`user:${techId}`).emit(eventName, complaint);
            io.to(`user:${techId}`).emit('complaint_updated', complaint);
          });
        }

        // Also emit general complaint_updated event if specific event is different
        if (eventName !== 'complaint_updated') {
          io.to(`org:${orgId}:role:admin`).emit('complaint_updated', complaint);
          io.to(`org:${orgId}:role:facilitymanager`).emit('complaint_updated', complaint);
          io.to(`user:${complaint.residentId}`).emit('complaint_updated', complaint);
          if (complaint.assignedTechnicianId) {
            io.to(`user:${complaint.assignedTechnicianId}`).emit('complaint_updated', complaint);
          }
        }
      }
    });

    complaintEvents.on('complaint.commentAdded', ({ orgId, complaint }) => {
      const io = getIO();
      if (io) {
        io.to(`org:${orgId}:role:admin`).emit('complaint_updated', complaint);
        io.to(`org:${orgId}:role:facilitymanager`).emit('complaint_updated', complaint);
        io.to(`user:${complaint.residentId}`).emit('complaint_updated', complaint);
        if (complaint.assignedTechnicianId) {
          io.to(`user:${complaint.assignedTechnicianId}`).emit('complaint_updated', complaint);
        }
      }
    });

    complaintSettingsEvents.on('settings.updated', ({ orgId, settings }) => {
      const io = getIO();
      if (io) {
        io.to(`org:${orgId}`).emit('complaints:settings:updated', settings);
      }
    });

    logger.info('Complaint socket listeners initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize complaint socket listeners:', error);
  }
};
