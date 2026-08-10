import { getIO } from '../../config/socket.js';
import crmInquiryEvents from './crmInquiry.events.js';
import logger from '../../utils/logger.utils.js';

crmInquiryEvents.on('LEAD_REGISTERED', (inquiry) => {
  try {
    const io = getIO();
    // Broadcast strictly to SUPER_ADMIN_ROOM based on roles
    io.to('role:Super Admin').emit('LEAD_REGISTERED', inquiry);
    logger.info(`[Socket] Broadcast LEAD_REGISTERED to Super Admins for Inquiry: ${inquiry.inquiryId}`);
  } catch (error) {
    logger.error(`[Socket Error] LEAD_REGISTERED event failed: ${error.message}`);
  }
});
