import { EventEmitter } from 'events';
import { dispatchWalkInPending, dispatchWalkInResolved } from './visitorLog.socket.js';
import notificationService from '../notification/notification.service.js';
import logger from '../../utils/logger.utils.js';

class VisitorLogEvents extends EventEmitter {}

const visitorLogEvents = new VisitorLogEvents();

// Hook event to Socket dispatcher
visitorLogEvents.on('walk_in_pending', (log) => {
  logger.info(`Visitor log event bus triggered: walk_in_pending for log ID ${log._id}`);
  dispatchWalkInPending(log);
  
  // Create a DB notification for the resident to alert them via UI headers/inbox
  if (log.residentId) {
    notificationService.createNotification({
      recipientId: log.residentId,
      senderId: log.guardId,
      title: 'Gate Approval Required',
      body: `Visitor "${log.snapshot?.visitorName || 'Walk-in'}" is waiting at the gate.`,
      actionUrl: '#/visitor-management?tab=walkin',
      type: 'WARNING'
    }).catch((err) => {
      logger.error(`Failed to create VMS notification for resident ${log.residentId}:`, err);
    });
  }
});

visitorLogEvents.on('walk_in_resolved', (log) => {
  logger.info(`Visitor log event bus triggered: walk_in_resolved for log ID ${log._id}`);
  dispatchWalkInResolved(log);
});

visitorLogEvents.on('log_created', (log) => {
  logger.info(`Visitor log event bus triggered: log_created for log ID ${log._id}`);
  if (log.residentId) {
    notificationService.createNotification({
      recipientId: log.residentId,
      senderId: log.guardId,
      title: 'Visitor Checked In',
      body: `Visitor "${log.snapshot?.visitorName || 'Guest'}" has checked in and entered the premises.`,
      actionUrl: '#/visitor-management?tab=logs',
      type: 'SUCCESS'
    }).catch((err) => {
      logger.error(`Failed to create VMS check-in notification for resident ${log.residentId}:`, err);
    });
  }
});

visitorLogEvents.on('log_checked_out', (log) => {
  logger.info(`Visitor log event bus triggered: log_checked_out for log ID ${log._id}`);
  if (log.residentId) {
    notificationService.createNotification({
      recipientId: log.residentId,
      senderId: log.guardId,
      title: 'Visitor Checked Out',
      body: `Visitor "${log.snapshot?.visitorName || 'Guest'}" has checked out and departed.`,
      actionUrl: '#/visitor-management?tab=logs',
      type: 'INFO'
    }).catch((err) => {
      logger.error(`Failed to create VMS checkout notification for resident ${log.residentId}:`, err);
    });
  }
});

export default visitorLogEvents;
