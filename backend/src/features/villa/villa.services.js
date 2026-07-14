import mongoose from 'mongoose';
import villaRepository from './villa.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import villaEvents from './villa.events.js';

export class VillaService {
  async getVillaById(id, orgId, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await villaRepository.findById(id, orgId, session);
    if (!villa) {
      throw new HttpError(404, `Villa with ID ${id} not found.`);
    }
    return villa;
  }

  async createVilla(villaData, session = null) {
    const { unitNumber, orgId } = villaData;
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    if (!unitNumber) throw new HttpError(400, 'Unit number is required.');

    const trimmedNumber = unitNumber.trim();
    const existing = await villaRepository.findByUnitNumber(trimmedNumber, orgId, session);
    if (existing) {
      throw new HttpError(409, `Conflict. Unit number "${trimmedNumber}" already exists in this community.`);
    }

    const villa = await villaRepository.create(orgId, { ...villaData, unitNumber: trimmedNumber }, session);
    villaEvents.emit('VILLA_CREATED', villa);
    return villa;
  }

  async updateVilla(id, orgId, updateData, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await this.getVillaById(id, orgId, session);

    // If unit number is changing, verify uniqueness
    if (updateData.unitNumber && updateData.unitNumber.trim() !== villa.unitNumber) {
      const trimmedNumber = updateData.unitNumber.trim();
      const existing = await villaRepository.findByUnitNumber(trimmedNumber, orgId, session);
      if (existing) {
        throw new HttpError(409, `Conflict. Unit number "${trimmedNumber}" already exists in this community.`);
      }
      updateData.unitNumber = trimmedNumber;
    }

    const updatedVilla = await villaRepository.update(id, orgId, updateData, session);
    villaEvents.emit('VILLA_UPDATED', updatedVilla);
    return updatedVilla;
  }

  async deleteVilla(id, orgId, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    await this.getVillaById(id, orgId, session);
    const deleted = await villaRepository.delete(id, orgId, session);
    villaEvents.emit('VILLA_DELETED', id);
    return deleted;
  }

  async getAllVillas(orgId, page = 1, limit = 10, filters = {}, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    
    // Extract search query
    const { search, ...restFilters } = filters;
    
    const { data, total } = await villaRepository.findPaginated(
      { orgId, page, limit, search, ...restFilters },
      session
    );
    
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: totalPages || 1,
        limit,
      },
    };
  }

  async getVillaStats(orgId, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    return await villaRepository.getOccupancyStats(orgId, session);
  }

  /**
   * Fetches a villa and its associated resident users from the Membership service
   */
  async getVillaDetailsWithResidents(id, orgId, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await this.getVillaById(id, orgId, session);

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
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
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
        const unitNumber = prefix ? `${prefix.trim()} ${numStr}` : numStr;

        // Skip if already exists
        const existing = await villaRepository.findByUnitNumber(unitNumber, orgId, session);
        if (existing) continue;

        const villa = await villaRepository.create(orgId, {
          unitNumber,
          blockOrBuilding: config.blockOrBuilding || '',
          type: config.type || 'Apartment',
          status: 'Vacant',
          floorAreaSqFt: config.floorAreaSqFt || null
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

  async updateVillaOccupancy(id, orgId, occupancyStatus, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    // Map occupancyStatus to status schema field
    let status = 'Vacant';
    if (occupancyStatus === 'Owner Occupied' || occupancyStatus === 'Tenant Occupied') {
      status = 'Occupied';
    }
    return await villaRepository.update(id, orgId, { status }, session);
  }

  async getVillaByNumber(unitNumber, orgId, session = null) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    return await villaRepository.findByUnitNumber(unitNumber, orgId, session);
  }

  async bulkUploadVillasAndResidents(villasArray, orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const successes = [];
    const failures = [];

    const userService = (await import('../user/user.services.js')).default;

    for (const item of villasArray) {
      const { unitNumber, blockOrBuilding = '', type = 'Apartment', status = 'Vacant', floorAreaSqFt = null, email, residentType = 'None', roleName } = item;
      const trimmedNumber = unitNumber ? unitNumber.trim() : '';
      const trimmedEmail = email ? email.trim().toLowerCase() : '';

      if (!trimmedNumber) {
        failures.push({
          unitNumber: '',
          email: trimmedEmail || null,
          error: 'Unit number is required'
        });
        continue;
      }

      try {
        let villa = await villaRepository.findByUnitNumber(trimmedNumber, orgId);
        let action = 'Created';

        if (villa) {
          const updateData = {};
          if (blockOrBuilding) updateData.blockOrBuilding = blockOrBuilding;
          if (type) updateData.type = type;
          if (status) updateData.status = status;
          if (floorAreaSqFt !== null && floorAreaSqFt !== undefined) updateData.floorAreaSqFt = floorAreaSqFt;
          
          villa = await villaRepository.update(villa._id, orgId, updateData);
          action = 'Updated';
        } else {
          villa = await villaRepository.create(orgId, {
            unitNumber: trimmedNumber,
            blockOrBuilding,
            type,
            status,
            floorAreaSqFt
          });
        }

        let userInvited = false;
        let inviteError = null;

        if (trimmedEmail) {
          try {
            if (!['Owner', 'Tenant', 'Family'].includes(residentType)) {
              throw new Error(`Invalid resident type '${residentType}' for user invitation.`);
            }
            if (!roleName) {
              throw new Error('Role name is required to invite user.');
            }

            await userService.inviteUser(trimmedEmail, orgId, villa._id, residentType, roleName);
            userInvited = true;
          } catch (err) {
            inviteError = err.message || 'User invitation failed';
          }
        }

        successes.push({
          unitNumber: trimmedNumber,
          action,
          email: trimmedEmail || null,
          userInvited,
          inviteError
        });
      } catch (error) {
        failures.push({
          unitNumber: trimmedNumber,
          email: trimmedEmail || null,
          error: error.message || 'Villa operations failed'
        });
      }
    }

    villaEvents.emit('VILLAS_BULK_UPLOADED', { orgId, total: villasArray.length });

    return {
      total: villasArray.length,
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures
    };
  }
}

export default new VillaService();
