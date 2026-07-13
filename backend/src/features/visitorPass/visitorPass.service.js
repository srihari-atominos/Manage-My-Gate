import visitorPassRepository from './visitorPass.repository.js';
import visitorPassEvents from './visitorPass.events.js';
import HttpError from '../../utils/httpError.utils.js';
import blacklistService from '../blacklist/blacklist.service.js';
import visitorPassTokenService from '../visitorPassToken/visitorPassToken.service.js';

export class VisitorPassService {
  /**
   * Create a new VisitorPass.
   * @param {Object} passData - The visitor pass details.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The created pass document.
   */
  async createPass(passData, session) {
    if (passData && passData.validity) {
      if (passData.validity.startDate) {
        const start = new Date(passData.validity.startDate);
        start.setHours(0, 0, 0, 0);
        passData.validity.startDate = start;
      }
      if (passData.validity.endDate) {
        const end = new Date(passData.validity.endDate);
        end.setHours(23, 59, 59, 999);
        passData.validity.endDate = end;
      }
    }
    const pass = await visitorPassRepository.create(passData, session);
    const shortKey = await visitorPassTokenService.generateToken(pass.orgId, pass._id, pass.validity.endDate, session);
    
    const passObj = pass.toObject ? pass.toObject() : pass;
    passObj.shortKey = shortKey;

    visitorPassEvents.emit('pass_created', passObj);
    return passObj;
  }

  /**
   * Revoke an active or pending VisitorPass.
   * @param {string} passId - The ID of the pass to revoke.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The revoked pass document.
   */
  async revokePass(passId, session) {
    const pass = await visitorPassRepository.findById(passId, session);
    if (!pass) {
      throw new HttpError(404, `Visitor pass with ID ${passId} not found.`);
    }

    if (pass.status === 'REVOKED' || pass.status === 'EXPIRED') {
      throw new HttpError(400, `Visitor pass is already ${pass.status.toLowerCase()}.`);
    }

    const updatedPass = await visitorPassRepository.updateStatus(passId, 'REVOKED', session);
    await visitorPassTokenService.deleteTokenByPassId(passId, session);

    visitorPassEvents.emit('pass_revoked', updatedPass);
    return updatedPass;
  }

  /**
   * Verify if a pass is valid for entry.
   * @param {string} passId - The ID of the pass to verify.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The verified pass document if valid.
   */
  async verifyPassForEntry(passId, session) {
    const pass = await visitorPassRepository.findById(passId, session);
    if (!pass) {
      throw new HttpError(404, `Visitor pass with ID ${passId} not found.`);
    }

    // 1. Check status
    if (pass.status !== 'PENDING' && pass.status !== 'ACTIVE') {
      throw new HttpError(400, `Visitor pass status is ${pass.status.toLowerCase()}; expected PENDING or ACTIVE.`);
    }

    const now = new Date();

    // 2. Check Date Validity
    const currentMs = now.getTime();
    
    // Normalize start date to beginning of the day (00:00:00.000)
    const startDateObj = new Date(pass.validity.startDate);
    startDateObj.setHours(0, 0, 0, 0);
    const startMs = startDateObj.getTime();
    
    // Normalize end date to the very end of the day (23:59:59.999)
    const endDateObj = new Date(pass.validity.endDate);
    endDateObj.setHours(23, 59, 59, 999);
    const endMs = endDateObj.getTime();

    if (currentMs < startMs || currentMs > endMs) {
      throw new HttpError(400, 'Visitor pass validity date range is not currently active.');
    }

    // 3. Check Time Window Validity
    if (pass.validity.timeWindowStart && pass.validity.timeWindowEnd) {
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr < pass.validity.timeWindowStart || currentTimeStr > pass.validity.timeWindowEnd) {
        throw new HttpError(400, `Visitor pass is only valid between ${pass.validity.timeWindowStart} and ${pass.validity.timeWindowEnd}.`);
      }
    }

    // 4. Check Allowed Days
    if (pass.validity.allowedDays && pass.validity.allowedDays.length > 0) {
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      if (!pass.validity.allowedDays.includes(currentDay)) {
        throw new HttpError(400, 'Visitor pass is not authorized for use on this day of the week.');
      }
    }

    // 5. Check Usage Limit
    if (pass.usageLimit.currentUses >= pass.usageLimit.maxUses) {
      throw new HttpError(400, 'Visitor pass has already reached its maximum usage limit.');
    }

    // 6. Check Blacklist Banned Profile
    const isBanned = await blacklistService.checkMatch(pass.orgId, {
      name: pass.visitorDetails?.name,
      phone: pass.visitorDetails?.phone,
      plate: pass.vehicleDetails?.number
    });
    if (isBanned) {
      throw new HttpError(403, `Visitor is blacklisted: ${isBanned.reason}`);
    }

    return pass;
  }

  /**
   * Record pass usage (increments uses, transitions status from PENDING to ACTIVE, and to EXPIRED if limit reached).
   * @param {string|Object} pass - Pass ID or pass document.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The updated pass document.
   */
  async usePass(pass, session = null) {
    const passDoc = typeof pass === 'string'
      ? await this.verifyPassForEntry(pass, session)
      : pass;

    const updates = {};
    if (passDoc.status === 'PENDING') {
      updates.status = 'ACTIVE';
    }
    updates['usageLimit.currentUses'] = passDoc.usageLimit.currentUses + 1;
    if (updates['usageLimit.currentUses'] >= passDoc.usageLimit.maxUses) {
      updates.status = 'EXPIRED';
    }

    const updated = await visitorPassRepository.update(passDoc._id, { $set: updates }, session);

    visitorPassEvents.emit('pass_updated', updated);
    return updated;
  }

  /**
   * Get a pass by its ID (read-only, does not perform gate validations).
   * @param {string} id - The pass ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The pass document.
   */
  async getPassById(id, session = null) {
    const pass = await visitorPassRepository.findById(id, session);
    if (!pass) {
      throw new HttpError(404, `Visitor pass with ID ${id} not found.`);
    }
    const passObj = pass.toObject ? pass.toObject() : pass;
    passObj.shortKey = await visitorPassTokenService.getShortKeyByPassId(pass._id, session);
    return passObj;
  }

  /**
   * Get paginated active/pending passes in an organization.
   * @param {string} orgId - The organization ID.
   * @param {number} skip - Skip.
   * @param {number} limit - Limit.
   * @param {string[]} statuses - Statuses to query.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<{ data: Object[], totalRecords: number }>}
   */
  async getActivePasses(orgId, skip, limit, statuses, session = null) {
    const result = await visitorPassRepository.findActivePassesByOrg(orgId, skip, limit, statuses, session);
    if (result && result.data) {
      const mapped = [];
      for (const pass of result.data) {
        const passObj = pass.toObject ? pass.toObject() : pass;
        passObj.shortKey = await visitorPassTokenService.getShortKeyByPassId(passObj._id, session);
        mapped.push(passObj);
      }
      result.data = mapped;
    }
    return result;
  }

  /**
   * Update a pass status.
   * @param {string} id - The pass ID.
   * @param {string} status - The new status.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>}
   */
  async updatePassStatus(id, status, session = null) {
    const updated = await visitorPassRepository.updateStatus(id, status, session);
    if (!updated) {
      throw new HttpError(404, `Visitor pass with ID ${id} not found.`);
    }
    visitorPassEvents.emit('pass_updated', updated);
    return updated;
  }
}

export default new VisitorPassService();
