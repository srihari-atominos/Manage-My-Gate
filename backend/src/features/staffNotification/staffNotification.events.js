import mongoose from 'mongoose';
import staffAttendanceEvents from '../staffAttendance/staffAttendance.events.js';
import staffNotificationService from './staffNotification.service.js';
import logger from '../../utils/logger.utils.js';

/**
 * Event subscriber for real-time staff entry events.
 * Provides immediate in-process notification dispatch alongside the durable Outbox queue.
 */
staffAttendanceEvents.on('staff_entry', async (eventData) => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return;
    }

    const session = eventData?.session;
    const technician = eventData?.technician;
    const orgId = eventData?.orgId;

    if (!session || !technician || !orgId) {
      return;
    }

    const payload = {
      sessionId: session._id ? session._id.toString() : String(session),
      technicianId: technician._id ? technician._id.toString() : String(technician),
      staffCode: technician.staffCode || '',
      staffName:
        technician.name ||
        `${technician.firstName || ''} ${technician.lastName || ''}`.trim() ||
        'Staff Member',
      department: technician.department || technician.trade || technician.designation || 'Staff',
      orgId: orgId.toString(),
      gateId: session.checkInGate || 'Main Gate',
      guardId: session.checkInGuardId ? session.checkInGuardId.toString() : null,
      checkInTime: session.checkInTime || new Date(),
    };

    logger.info(`[StaffNotification EventBus] Processing real-time staff entry for session ${payload.sessionId}`);
    await staffNotificationService.processStaffEntryEvent(payload);
  } catch (err) {
    logger.error(`[StaffNotification EventBus] Error processing real-time staff entry: ${err.message}`);
  }
});

/**
 * Event subscriber for real-time staff exit events.
 * Provides immediate in-process notification dispatch alongside the durable Outbox queue.
 */
staffAttendanceEvents.on('staff_exit', async (eventData) => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return;
    }

    const session = eventData?.session;
    const technician = eventData?.technician;
    const orgId = eventData?.orgId;

    if (!session || !technician || !orgId) {
      return;
    }

    const payload = {
      sessionId: session._id ? session._id.toString() : String(session),
      technicianId: technician._id ? technician._id.toString() : String(technician),
      staffCode: technician.staffCode || '',
      staffName:
        technician.name ||
        `${technician.firstName || ''} ${technician.lastName || ''}`.trim() ||
        'Staff Member',
      department: technician.department || technician.trade || technician.designation || 'Staff',
      orgId: orgId.toString(),
      gateId: session.exitGate || 'Main Gate',
      guardId: session.exitGuardId ? session.exitGuardId.toString() : null,
      checkOutTime: session.checkOutTime || new Date(),
    };

    logger.info(`[StaffNotification EventBus] Processing real-time staff exit for session ${payload.sessionId}`);
    await staffNotificationService.processStaffExitEvent(payload);
  } catch (err) {
    logger.error(`[StaffNotification EventBus] Error processing real-time staff exit: ${err.message}`);
  }
});

export default staffAttendanceEvents;
