import HttpError from '../../../utils/httpError.utils.js';
import amenityQuotaAllocationRepository from './amenityQuotaAllocation.repository.js';

export class AmenityQuotaAllocationService {
  /**
   * Generates standard period token for quota tracking.
   * @param {'DAILY'|'WEEKLY'|'MONTHLY'} quotaPeriod
   * @param {Date} date
   * @returns {string}
   */
  getPeriodToken(quotaPeriod, date = new Date()) {
    const d = new Date(date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');

    switch (quotaPeriod) {
      case 'DAILY':
        return `${yyyy}-${mm}-${dd}`;
      case 'WEEKLY': {
        const startOfYear = new Date(Date.UTC(yyyy, 0, 1));
        const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
        return `${yyyy}-W${String(weekNum).padStart(2, '0')}`;
      }
      case 'MONTHLY':
      default:
        return `${yyyy}-${mm}`;
    }
  }

  /**
   * Generates the deterministic Quota Document ID.
   * Format: QUOTA:<orgId>:<unitId>:<facilityId>:<periodToken>
   */
  getQuotaId(orgId, unitId, facilityId, periodToken) {
    return `QUOTA:${orgId}:${unitId}:${facilityId}:${periodToken}`;
  }

  /**
   * Atomically reserves quota units for a household/villa.
   * Throws 403 HttpError if quota limit would be exceeded.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.unitId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {'DAILY'|'WEEKLY'|'MONTHLY'} [params.quotaPeriod='MONTHLY']
   * @param {number} [params.quotaLimit=240] - Default 240 units/minutes
   * @param {number} params.requestedUnits
   * @param {Date} [params.date]
   * @param {import('mongoose').ClientSession} [session]
   */
  async reserveQuota(
    {
      orgId,
      unitId,
      facilityId,
      quotaPeriod = 'MONTHLY',
      quotaLimit = 240,
      requestedUnits,
      date = new Date(),
    },
    session
  ) {
    if (!requestedUnits || requestedUnits <= 0) {
      return null;
    }

    const periodToken = this.getPeriodToken(quotaPeriod, date);
    const quotaId = this.getQuotaId(orgId, unitId, facilityId, periodToken);

    const updatedQuota = await amenityQuotaAllocationRepository.reserveQuota(
      {
        quotaId,
        orgId,
        unitId,
        facilityId,
        quotaPeriod,
        periodToken,
        quotaLimit,
        requestedUnits,
      },
      session
    );

    if (!updatedQuota) {
      throw new HttpError(
        403,
        `Household quota limit exceeded for this period (limit: ${quotaLimit} units)`
      );
    }

    return updatedQuota;
  }

  /**
   * Promotes reserved quota to consumed quota upon confirmation.
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.unitId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {'DAILY'|'WEEKLY'|'MONTHLY'} [params.quotaPeriod='MONTHLY']
   * @param {number} params.requestedUnits
   * @param {Date} [params.date]
   * @param {import('mongoose').ClientSession} [session]
   */
  async promoteQuota(
    { orgId, unitId, facilityId, quotaPeriod = 'MONTHLY', requestedUnits, date = new Date() },
    session
  ) {
    if (!requestedUnits || requestedUnits <= 0) return null;
    const periodToken = this.getPeriodToken(quotaPeriod, date);
    const quotaId = this.getQuotaId(orgId, unitId, facilityId, periodToken);
    return amenityQuotaAllocationRepository.promoteQuota(quotaId, requestedUnits, session);
  }

  /**
   * Releases reserved quota units upon hold expiration or booking rejection.
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.unitId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {'DAILY'|'WEEKLY'|'MONTHLY'} [params.quotaPeriod='MONTHLY']
   * @param {number} params.requestedUnits
   * @param {Date} [params.date]
   * @param {import('mongoose').ClientSession} [session]
   */
  async releaseQuota(
    { orgId, unitId, facilityId, quotaPeriod = 'MONTHLY', requestedUnits, date = new Date() },
    session
  ) {
    if (!requestedUnits || requestedUnits <= 0) return null;
    const periodToken = this.getPeriodToken(quotaPeriod, date);
    const quotaId = this.getQuotaId(orgId, unitId, facilityId, periodToken);
    return amenityQuotaAllocationRepository.releaseQuota(quotaId, requestedUnits, session);
  }

  /**
   * Refunds consumed quota units upon cancellation.
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.unitId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {'DAILY'|'WEEKLY'|'MONTHLY'} [params.quotaPeriod='MONTHLY']
   * @param {number} params.requestedUnits
   * @param {Date} [params.date]
   * @param {import('mongoose').ClientSession} [session]
   */
  async refundQuota(
    { orgId, unitId, facilityId, quotaPeriod = 'MONTHLY', requestedUnits, date = new Date() },
    session
  ) {
    if (!requestedUnits || requestedUnits <= 0) return null;
    const periodToken = this.getPeriodToken(quotaPeriod, date);
    const quotaId = this.getQuotaId(orgId, unitId, facilityId, periodToken);
    return amenityQuotaAllocationRepository.refundQuota(quotaId, requestedUnits, session);
  }
}

export const amenityQuotaAllocationService = new AmenityQuotaAllocationService();
export default amenityQuotaAllocationService;
