import amenityCounterRepository from './amenityCounter.repository.js';

export class AmenityCounterService {
  /**
   * Generates a tenant-scoped, atomic sequential reservation number: RES-YYYYMM-000001.
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string} [params.yearMonth]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<string>}
   */
  async generateReservationNumber({ orgId, yearMonth }, session) {
    return amenityCounterRepository.getNextReservationNumber({ orgId, yearMonth }, session);
  }
}

export const amenityCounterService = new AmenityCounterService();
export default amenityCounterService;
