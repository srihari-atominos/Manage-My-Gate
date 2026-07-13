import visitorLogRepository from './visitorLog.repository.js';
import visitorPassService from '../visitorPass/visitorPass.service.js';
import visitorLogEvents from './visitorLog.events.js';
import HttpError from '../../utils/httpError.utils.js';
import blacklistService from '../blacklist/blacklist.service.js';
import visitorPassTokenService from '../visitorPassToken/visitorPassToken.service.js';

export class VisitorLogService {
  /**
   * Logs entry for a pre-approved visitor pass.
   * Modifies pass status and usages transactionally inside the session.
   * @param {string} passId - The visitor pass ID.
   * @param {string} guardId - The checking-in guard's user ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The created entry log.
   */
  async logPreApprovedEntry(passId, guardId, session = null) {
    // 1. Verify pass status, dates, times, allowed days, usage limits
    const pass = await visitorPassService.verifyPassForEntry(passId, session);

    // 2. Use pass transactionally (increments usage count, updates status)
    await visitorPassService.usePass(pass, session);

    // 3. Prepare log data
    const logData = {
      orgId: pass.orgId,
      passId: pass._id,
      guardId,
      residentId: pass.createdById,
      entryType: 'PRE_APPROVED',
      logStatus: 'INSIDE',
      snapshot: {
        visitorName: pass.visitorDetails?.name,
        idProofNumber: pass.visitorDetails?.idProofNumber,
        vehicleNumber: pass.vehicleDetails?.number
      },
      checkInTime: new Date()
    };

    // 4. Create log entry
    const log = await visitorLogRepository.create(logData, session);

    // 5. Emit events
    visitorLogEvents.emit('log_created', log);

    return log;
  }

  /**
   * Initiates a walk-in entry request at the gate, waiting for resident approval.
   * @param {Object} walkInData - Details of the walk-in visitor.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The pending visitor log.
   */
  async initiateWalkInRequest(walkInData, session = null) {
    // Check Blacklist before initiating walk-in
    const isBanned = await blacklistService.checkMatch(walkInData.orgId, {
      name: walkInData.snapshot?.visitorName,
      plate: walkInData.snapshot?.vehicleNumber
    });
    if (isBanned) {
      throw new HttpError(403, `Visitor is blacklisted: ${isBanned.reason}`);
    }

    const logData = {
      orgId: walkInData.orgId,
      guardId: walkInData.guardId,
      residentId: walkInData.residentId,
      entryType: 'WALK_IN',
      logStatus: 'PENDING',
      snapshot: {
        visitorName: walkInData.snapshot?.visitorName,
        idProofNumber: walkInData.snapshot?.idProofNumber,
        vehicleNumber: walkInData.snapshot?.vehicleNumber
      }
    };

    const log = await visitorLogRepository.create(logData, session);
    visitorLogEvents.emit('walk_in_pending', log);
    return log;
  }

  /**
   * Resident resolves a pending walk-in check-in request (APPROVE or REJECT).
   * @param {string} logId - The visitor log ID.
   * @param {'APPROVE'|'REJECT'} action - The resident action.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The resolved visitor log.
   */
  async resolveWalkInRequest(logId, action, session = null) {
    const log = await visitorLogRepository.findById(logId, session);
    if (!log) {
      throw new HttpError(404, `Visitor log with ID ${logId} not found.`);
    }

    if (log.logStatus !== 'PENDING') {
      throw new HttpError(400, `Visitor log with ID ${logId} is already resolved or not pending.`);
    }

    let updateData = {};
    if (action === 'APPROVE') {
      updateData = {
        logStatus: 'INSIDE',
        checkInTime: new Date()
      };
    } else if (action === 'REJECT') {
      updateData = {
        logStatus: 'REJECTED'
      };
    } else {
      throw new HttpError(400, `Invalid action "${action}". Must be "APPROVE" or "REJECT".`);
    }

    const updatedLog = await visitorLogRepository.update(logId, updateData, session);
    visitorLogEvents.emit('walk_in_resolved', updatedLog);
    return updatedLog;
  }

  /**
   * Record checkout for a visitor.
   * @param {string} logId - The visitor log ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The checked out log.
   */
  async checkout(logId, session = null) {
    const log = await visitorLogRepository.findById(logId, session);
    if (!log) {
      throw new HttpError(404, `Visitor log with ID ${logId} not found.`);
    }

    if (log.logStatus !== 'INSIDE') {
      throw new HttpError(400, `Visitor log with ID ${logId} status is not INSIDE.`);
    }

    const updatedLog = await visitorLogRepository.updateLogForCheckout(logId, new Date(), session);
    
    // Cleanup expired tokens from mapping if no other visitors remain inside under this pass
    if (updatedLog.passId) {
      try {
        const pass = await visitorPassService.getPassById(updatedLog.passId, session);
        if (pass && pass.status === 'EXPIRED') {
          const logsInside = await visitorLogRepository.findActiveLogsInside(log.orgId, session);
          const anyoneLeft = logsInside.some(l => 
            l.passId?.toString() === pass._id?.toString() && 
            l._id?.toString() !== logId.toString()
          );
          if (!anyoneLeft) {
            await visitorPassTokenService.deleteTokenByPassId(pass._id, session);
          }
        }
      } catch (err) {
        console.error('Failed to clean up expired token mapping:', err);
      }
    }

    visitorLogEvents.emit('log_checked_out', updatedLog);
    return updatedLog;
  }

  /**
   * Fetch active logs for visitors currently inside the premises.
   * @param {string} orgId - The organization ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object[]>}
   */
  async getActiveLogsInside(orgId, session = null) {
    return await visitorLogRepository.findActiveLogsInside(orgId, session);
  }

  /**
   * Fetch pending walk-in log approvals.
   * @param {string} orgId - The organization ID.
   * @param {string|null} residentId - Optional resident ID to filter by.
   * @returns {Promise<Object[]>}
   */
  async getPendingApprovals(orgId, residentId = null) {
    const query = {
      orgId,
      logStatus: 'PENDING'
    };
    if (residentId) {
      query.residentId = residentId;
    }
    return await visitorLogRepository.findPendingApprovals(query);
  }

  /**
   * Fetch paginated visitor logs history in an organization.
   * @param {string} orgId - The organization ID.
   * @param {number} skip - Number of items to skip.
   * @param {number} limit - Number of items to return.
   * @param {Object} [filters={}] - Optional filters.
   * @param {import('mongoose').ClientSession} [session=null] - Optional Mongoose session.
   * @returns {Promise<{ data: Object[], totalRecords: number }>}
   */
  async getHistoryLogs(orgId, skip, limit, filters = {}, session = null) {
    return await visitorLogRepository.findHistoryLogsByOrg(orgId, skip, limit, filters, session);
  }
}

export default new VisitorLogService();
