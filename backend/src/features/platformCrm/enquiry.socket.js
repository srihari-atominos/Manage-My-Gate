import enquiryEvents from './enquiry.events.js';

/**
 * Initializes the Socket.io listeners for the Platform CRM Enquiry module.
 * @param {Object} io - The initialized socket.io instance from the global infrastructure.
 */
export const initEnquirySockets = (io) => {
  // Listen for internal application events and broadcast them to connected clients
  
  enquiryEvents.on('enquiry_created', (enquiry) => {
    try {
      // Broadcast to admins that a new enquiry arrived
      io.to('role:ADMIN').to('role:SUPER_ADMIN').to('role:SALES_EXECUTIVE').emit('CRM_ENQUIRY_CREATED', enquiry);
    } catch (error) {
      console.error('[Socket] Failed to emit CRM_ENQUIRY_CREATED:', error);
    }
  });

  enquiryEvents.on('enquiry_status_changed', ({ enquiry, oldStatus }) => {
    try {
      io.to('role:ADMIN').to('role:SUPER_ADMIN').to('role:SALES_EXECUTIVE').emit('CRM_ENQUIRY_UPDATED', { enquiry, oldStatus });
    } catch (error) {
      console.error('[Socket] Failed to emit CRM_ENQUIRY_UPDATED:', error);
    }
  });

  enquiryEvents.on('enquiry_assigned', (enquiry) => {
    try {
      io.to('role:ADMIN').to('role:SUPER_ADMIN').to('role:SALES_EXECUTIVE').emit('CRM_ENQUIRY_UPDATED', { enquiry });
      // Also notify the specific user
      if (enquiry.assignedTo) {
        const userId = enquiry.assignedTo._id || enquiry.assignedTo;
        io.to(`user:${userId}`).emit('CRM_ENQUIRY_ASSIGNED_TO_YOU', enquiry);
      }
    } catch (error) {
      console.error('[Socket] Failed to emit CRM_ENQUIRY_ASSIGNED_TO_YOU:', error);
    }
  });

  enquiryEvents.on('enquiry_converted', ({ enquiry, organizationId, userId }) => {
    try {
      io.to('role:ADMIN').to('role:SUPER_ADMIN').to('role:SALES_EXECUTIVE').emit('CRM_ENQUIRY_CONVERTED', { enquiry, organizationId, userId });
    } catch (error) {
      console.error('[Socket] Failed to emit CRM_ENQUIRY_CONVERTED:', error);
    }
  });
};
