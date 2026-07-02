import mongoose from 'mongoose';
import villaRepository from './villa.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import villaEvents from './villa.events.js';

export class VillaService {
  async getVillaById(id, session) {
    const villa = await villaRepository.findById(id, session);
    if (!villa) {
      throw new HttpError(404, `Villa with ID ${id} not found.`);
    }
    return villa;
  }

  async createVilla(villaData, session = null) {
    const { villaNumber, orgId } = villaData;
    const trimmedNumber = villaNumber.trim();

    const existing = await villaRepository.findByVillaNumber(trimmedNumber, orgId, session);
    if (existing) {
      throw new HttpError(409, `Conflict. Villa number "${trimmedNumber}" already exists in this community.`);
    }

    const villa = await villaRepository.create({ ...villaData, villaNumber: trimmedNumber }, session);
    
    // Emit event outside transaction if possible, or just emit standard event
    villaEvents.emit('VILLA_CREATED', villa);

    return villa;
  }

  async updateVilla(id, updateData, session = null) {
    const villa = await this.getVillaById(id, session);

    // If villa number is changing, verify uniqueness
    if (updateData.villaNumber && updateData.villaNumber.trim() !== villa.villaNumber) {
      const trimmedNumber = updateData.villaNumber.trim();
      const existing = await villaRepository.findByVillaNumber(trimmedNumber, villa.orgId, session);
      if (existing) {
        throw new HttpError(409, `Conflict. Villa number "${trimmedNumber}" already exists in this community.`);
      }
      updateData.villaNumber = trimmedNumber;
    }

    const updatedVilla = await villaRepository.update(id, updateData, session);
    villaEvents.emit('VILLA_UPDATED', updatedVilla);
    return updatedVilla;
  }

  async deleteVilla(id, session = null) {
    await this.getVillaById(id, session);
    const deleted = await villaRepository.delete(id, session);
    villaEvents.emit('VILLA_DELETED', id);
    return deleted;
  }

  async getAllVillas(orgId, page = 1, limit = 10, filters = {}, session = null) {
    const skip = (page - 1) * limit;
    const { data, totalRecords } = await villaRepository.findAllPaginated(orgId, skip, limit, filters, session);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: totalPages || 1,
        limit,
      },
    };
  }

  async getVillaStats(orgId, session = null) {
    return await villaRepository.getOccupancyStats(orgId, session);
  }

  /**
   * Fetches a villa and its associated resident users from the Membership service
   */
  async getVillaDetailsWithResidents(id, session = null) {
    const villa = await this.getVillaById(id, session);

    // Cross-Feature Service Call
    const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
    const residents = await orgMembershipService.getResidentsForVilla(id, session);

    return {
      villa,
      residents: residents.map(r => ({
        id: r.userId?._id || r.userId,
        name: r.userId?.name || '',
        email: r.userId?.email || '',
        phone: r.userId?.phone || '',
        status: r.userId?.status || 'Pending',
        residentType: r.residentType,
        joinedAt: r.createdAt
      }))
    };
  }

  /**
   * Batch generates a list of villas (e.g. 54 villas for community setup) in a transaction.
   */
  async batchGenerateVillas({ orgId, startNumber = 1, endNumber = 54, prefix = 'Villa', config = {} }) {
    if (startNumber > endNumber) {
      throw new HttpError(400, 'Start number must be less than or equal to end number.');
    }
    if (endNumber - startNumber > 200) {
      throw new HttpError(400, 'Cannot batch generate more than 200 villas at once.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const createdVillas = [];
      for (let i = startNumber; i <= endNumber; i++) {
        // Zero-pad numbers for clean look, e.g. "Villa 01", "Villa 10"
        const numStr = i < 10 ? `0${i}` : `${i}`;
        const villaNumber = prefix ? `${prefix.trim()} ${numStr}` : numStr;

        // Skip if already exists
        const existing = await villaRepository.findByVillaNumber(villaNumber, orgId, session);
        if (existing) continue;

        const villa = await villaRepository.create({
          villaNumber,
          orgId,
          block: config.block || '',
          intercom: config.intercomPrefix ? `${config.intercomPrefix}${numStr}` : '',
          configuration: config.configuration || '',
          occupancyStatus: 'Vacant'
        }, session);

        createdVillas.push(villa);
      }

      await session.commitTransaction();
      villaEvents.emit('VILLAS_BATCH_CREATED', { orgId, count: createdVillas.length });

      return createdVillas;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateVillaOccupancy(id, occupancyStatus, session = null) {
    return await villaRepository.update(id, { occupancyStatus }, session);
  }

  async getVillaByNumber(villaNumber, orgId, session = null) {
    return await villaRepository.findByVillaNumber(villaNumber, orgId, session);
  }
}

export default new VillaService();
