import securityLogRepository from './securityLog.repository.js';
import { SECURITY_LOG_CREATED } from './securityLog.events.js';
import { getIO } from '../../config/socket.js';

class SecurityLogService {
  async createLog(payload) {
    const { 
      booking, 
      orgId, 
      scanType, 
      status, 
      reason, 
      remarks, 
      guardId, 
      guardName 
    } = payload;

    const logData = {
      orgId: orgId || booking?.orgId,
      bookingId: booking?._id,
      bookingReference: booking?.bookingId,
      userId: booking?.userId?._id || booking?.userId,
      residentName: booking?.userId?.name || booking?.userId?.username || 'Unknown',
      residentPhoto: booking?.userId?.profilePicture,
      amenityId: booking?.amenityId?._id || booking?.amenityId,
      amenityName: booking?.amenityId?.name,
      amenityImage: booking?.amenityId?.images?.[0],
      checkedInBy: guardId || (booking?.checkedInBy?._id || booking?.checkedInBy),
      guardName: guardName || booking?.checkedInBy?.name || 'System',
      scanType: scanType,
      status: status,
      reason: reason,
      remarks: remarks,
      scanTime: new Date()
    };

    if (scanType === 'Entry') {
      logData.entryTime = logData.scanTime;
    } else if (scanType === 'Exit') {
      logData.exitTime = logData.scanTime;
    }

    const savedLog = await securityLogRepository.createLog(logData);
    
    // Broadcast via Socket.IO (non-blocking)
    try {
      const io = getIO();
      if (io && logData.orgId) {
        const room = `org:${logData.orgId.toString()}`;
        io.to(room).emit(SECURITY_LOG_CREATED, savedLog);
      }
    } catch (socketErr) {
      // Socket might not be initialized in test environments — never crash the log creation
    }
    
    return savedLog;
  }

  async getLogs(orgId, filters, skip, limit) {
    return await securityLogRepository.getLogs(orgId, filters, skip, limit);
  }

  async getDashboardStats(orgId) {
    return await securityLogRepository.getDashboardStats(orgId);
  }

  async deleteLog(logId, orgId) {
    const deletedLog = await securityLogRepository.deleteLog(logId, orgId);
    
    if (deletedLog) {
      try {
        const io = getIO();
        if (io && orgId) {
          const room = `org:${orgId.toString()}`;
          const { SECURITY_LOG_DELETED } = await import('./securityLog.events.js');
          io.to(room).emit(SECURITY_LOG_DELETED, { id: logId });
        }
      } catch (socketErr) {
        // Socket error
      }
    }
    
    return deletedLog;
  }
}

export default new SecurityLogService();
