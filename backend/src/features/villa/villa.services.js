import mongoose from 'mongoose';
import villaRepository from './villa.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import villaEvents from './villa.events.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';
import User from '../user/user.model.js';
import Villa from './villa.model.js';

export class VillaService {
  async getUnitById(id, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getUnitById request received`, { id, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await villaRepository.findById(id, orgId, session);
    if (!villa) {
      throw new HttpError(404, `Unit with ID ${id} not found.`);
    }
    return villa;
  }

  async createUnit(orgId, unitData, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`createUnit request received`, { orgId, unitNumber: unitData?.unitNumber, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    if (!unitData || !unitData.unitNumber) throw new HttpError(400, 'Unit number is required.');

    const trimmedNumber = unitData.unitNumber.trim();
    const existing = await villaRepository.findByUnitNumber(trimmedNumber, orgId, session);
    if (existing) {
      throw new HttpError(409, `Conflict. Unit number "${trimmedNumber}" already exists in this community.`);
    }

    const villa = await villaRepository.create(orgId, { ...unitData, unitNumber: trimmedNumber }, session);
    
    // Emit native event bus event
    villaEvents.emit('unit_created', villa);
    
    return villa;
  }

  async updateUnit(id, orgId, updateData, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`updateUnit request received`, { id, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await this.getUnitById(id, orgId, session);

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
    
    villaEvents.emit('unit_updated', updatedVilla);
    
    return updatedVilla;
  }

  async deleteUnit(id, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`deleteUnit request received`, { id, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    await this.getUnitById(id, orgId, session);
    const deleted = await villaRepository.delete(id, orgId, session);
    
    return deleted;
  }

  async getUnitsPaginated({ orgId, page = 1, limit = 10, search, ...filters }, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getUnitsPaginated request received`, { orgId, page, limit, search, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    
    const { data, total } = await villaRepository.findPaginated(
      { orgId, page, limit, search, ...filters },
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

  /**
   * Returns all distinct, non-empty blockOrBuilding values for the org.
   * @param {string} orgId
   * @returns {Promise<string[]>} Sorted array of block names
   */
  async getDistinctBlocks(orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getDistinctBlocks request received`, { orgId, correlationId });
    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    return await villaRepository.getDistinctBlocks(orgId);
  }

  /**
   * Atomically assign primary resident to unit using a Mongoose Transaction.
   */
  async assignPrimaryResident(id, orgId, residentId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`assignPrimaryResident request received`, { id, orgId, residentId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get and verify the unit exists
      const villa = await villaRepository.findById(id, orgId, session);
      if (!villa) {
        throw new HttpError(404, `Unit with ID ${id} not found.`);
      }

      // 2. If residentId is provided, verify they belong to this organization
      if (residentId) {
        const membership = await OrgMembership.findOne({ userId: residentId, orgId }).session(session);
        if (!membership) {
          throw new HttpError(400, `User with ID ${residentId} is not a member of this organization.`);
        }

        // Link membership to this unit
        membership.villaId = villa._id;
        if (membership.residentType === 'None') {
          membership.residentType = 'Owner';
        }
        await membership.save({ session });
      }

      // 3. Clear old primary resident association if changing
      if (villa.primaryResidentId && String(villa.primaryResidentId) !== String(residentId)) {
        await OrgMembership.updateOne(
          { userId: villa.primaryResidentId, orgId, villaId: villa._id },
          { $set: { villaId: null, residentType: 'None' } }
        ).session(session);
      }

      // 4. Update the Unit
      villa.primaryResidentId = residentId || null;
      if (residentId) {
        villa.status = 'Occupied';
      } else {
        villa.status = 'Vacant';
      }
      await villa.save({ session });

      await session.commitTransaction();
      logger.info(`Successfully assigned resident and updated unit status`, { id, residentId, correlationId });

      // 5. Emit events outside transaction
      villaEvents.emit('unit_updated', villa);
      villaEvents.emit('resident_assigned', { villaId: villa._id, orgId, residentId });

      return villa;
    } catch (error) {
      logger.error(`Failed to assign primary resident, aborting transaction. Error: ${error.message}`, { id, residentId, correlationId });
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getVillaStats(orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getVillaStats request received`, { orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    return await villaRepository.getOccupancyStats(orgId, session);
  }

  /**
   * Fetches a unit and its associated resident users from the Membership service
   */
  async getVillaDetailsWithResidents(id, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getVillaDetailsWithResidents request received`, { id, orgId, correlationId });

    const villa = await Villa.findOne({ _id: id, orgId }).populate('residents.userId').session(session);
    if (!villa) {
      throw new HttpError(404, `Unit with ID ${id} not found.`);
    }

    const mappedResidents = (villa.residents || []).map(r => ({
      id: r.userId?._id?.toString() || r.userId?.toString(),
      name: r.userId?.name || r.userId?.username || '',
      email: r.userId?.email || '',
      phone: r.userId?.phone || '',
      status: r.userId?.status || 'Pending',
      residentType: r.residencyType,
      joinedAt: r.assignedAt
    }));

    return {
      villa,
      residents: mappedResidents
    };
  }

  /**
   * Batch generates a list of units in a transaction.
   */
  async batchGenerateVillas({ orgId, startNumber = 1, endNumber = 54, prefix = 'Villa', config = {} }) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`batchGenerateVillas request received`, { orgId, startNumber, endNumber, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    if (startNumber > endNumber) {
      throw new HttpError(400, 'Start number must be less than or equal to end number.');
    }
    if (endNumber - startNumber > 200) {
      throw new HttpError(400, 'Cannot batch generate more than 200 units at once.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const createdVillas = [];
      for (let i = startNumber; i <= endNumber; i++) {
        const numStr = i < 10 ? `0${i}` : `${i}`;
        const unitNumber = prefix ? `${prefix.trim()} ${numStr}` : numStr;

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
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`updateVillaOccupancy request received`, { id, orgId, occupancyStatus, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    let status = 'Vacant';
    if (occupancyStatus === 'Owner Occupied' || occupancyStatus === 'Tenant Occupied') {
      status = 'Occupied';
    }
    return await villaRepository.update(id, orgId, { status }, session);
  }

  async getVillaByNumber(unitNumber, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getVillaByNumber request received`, { unitNumber, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    return await villaRepository.findByUnitNumber(unitNumber, orgId, session);
  }

  async bulkUploadVillasAndResidents(villasArray, orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`bulkUploadVillasAndResidents request received`, { orgId, count: villasArray?.length, correlationId });

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

  async assignExistingUser(villaId, userId, residencyType, orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`assignExistingUser request received`, { villaId, userId, residencyType, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get the unit
      const villa = await villaRepository.findById(villaId, orgId, session);
      if (!villa) {
        throw new HttpError(404, `Unit with ID ${villaId} not found.`);
      }

      // 2. Verify the user is a member of the organization
      const membership = await OrgMembership.findOne({ userId, orgId }).session(session);
      if (!membership) {
        throw new HttpError(400, `User with ID ${userId} is not a member of this organization.`);
      }

      // Check if user is already assigned to this unit
      const alreadyAssigned = villa.residents.some(r => String(r.userId) === String(userId));
      if (!alreadyAssigned) {
        villa.residents.push({
          userId,
          residencyType,
          isPrimary: false,
          assignedAt: new Date()
        });
      } else {
        // Just update the residencyType if already there
        const resident = villa.residents.find(r => String(r.userId) === String(userId));
        resident.residencyType = residencyType;
      }

      // If status is Vacant, mark as Occupied
      if (villa.status === 'Vacant') {
        villa.status = 'Occupied';
      }

      await villa.save({ session });

      // 3. Update User document
      await User.updateOne(
        { _id: userId },
        { $set: { villaId: villa._id, residencyType } }
      ).session(session);

      // 4. Update OrgMembership
      const mappedResidentType = (type) => {
        switch (type) {
          case 'Resident Owner':
          case 'Non-Resident Owner':
            return 'Owner';
          case 'Tenant':
            return 'Tenant';
          case 'Family Member':
            return 'Family';
          case 'Staff':
          default:
            return 'Guest';
        }
      };
      membership.villaId = villa._id;
      membership.residentType = mappedResidentType(residencyType);

      // Sync user role in membership to the selected tenant role
      const roleService = (await import('../role/role.services.js')).default;
      const roleObj = await roleService.getRoleByName(residencyType, orgId, session);
      if (roleObj) {
        membership.roleId = roleObj._id;
        membership.roleIds = [roleObj._id];
      }

      await membership.save({ session });

      await session.commitTransaction();
      logger.info(`Successfully assigned existing user to unit`, { villaId, userId, residencyType, correlationId });

      // Emit events outside transaction
      villaEvents.emit('unit_updated', villa);
      villaEvents.emit('resident_assigned', { villaId: villa._id, orgId, userId, residencyType });

      return villa;
    } catch (error) {
      logger.error(`Failed to assign existing user, aborting transaction. Error: ${error.message}`, { villaId, userId, residencyType, correlationId });
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateResidencyType(villaId, userId, newResidencyType, orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`updateResidencyType request received`, { villaId, userId, newResidencyType, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get the unit
      const villa = await villaRepository.findById(villaId, orgId, session);
      if (!villa) {
        throw new HttpError(404, `Unit with ID ${villaId} not found.`);
      }

      // 2. Update sub-document type inside residents array
      const residentIndex = villa.residents.findIndex(r => String(r.userId) === String(userId));
      if (residentIndex === -1) {
        throw new HttpError(404, `User ${userId} is not assigned to unit ${villaId}.`);
      }
      villa.residents[residentIndex].residencyType = newResidencyType;
      await villa.save({ session });

      // 3. Sync User Profile
      await User.updateOne(
        { _id: userId },
        { $set: { residencyType: newResidencyType } }
      ).session(session);

      // 4. Sync OrgMembership
      const mappedResidentType = (type) => {
        switch (type) {
          case 'Resident Owner':
          case 'Non-Resident Owner':
            return 'Owner';
          case 'Tenant':
            return 'Tenant';
          case 'Family Member':
            return 'Family';
          case 'Staff':
          default:
            return 'Guest';
        }
      };
      // Sync user role in membership to the selected tenant role
      const roleService = (await import('../role/role.services.js')).default;
      const roleObj = await roleService.getRoleByName(newResidencyType, orgId, session);
      const updateFields = { residentType: mappedResidentType(newResidencyType) };
      if (roleObj) {
        updateFields.roleId = roleObj._id;
        updateFields.roleIds = [roleObj._id];
      }

      await OrgMembership.updateOne(
        { userId, orgId },
        { $set: updateFields }
      ).session(session);

      await session.commitTransaction();
      logger.info(`Successfully updated residency type for user in unit`, { villaId, userId, newResidencyType, correlationId });

      // Emit events outside transaction
      villaEvents.emit('unit_updated', villa);
      villaEvents.emit('resident_type_updated', { villaId: villa._id, orgId, userId, residencyType: newResidencyType });

      return villa;
    } catch (error) {
      logger.error(`Failed to update residency type, aborting transaction. Error: ${error.message}`, { villaId, userId, newResidencyType, correlationId });
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async removeResident(villaId, userId, orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`removeResident request received`, { villaId, userId, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get the unit
      const villa = await villaRepository.findById(villaId, orgId, session);
      if (!villa) {
        throw new HttpError(404, `Unit with ID ${villaId} not found.`);
      }

      // 2. Pull resident from the array
      villa.residents = villa.residents.filter(r => String(r.userId) !== String(userId));
      
      // If the removed user was primary, clear it
      if (villa.primaryResidentId && String(villa.primaryResidentId) === String(userId)) {
        villa.primaryResidentId = null;
      }

      // If no residents remain, mark as Vacant
      if (villa.residents.length === 0) {
        villa.status = 'Vacant';
      }

      await villa.save({ session });

      // 3. Clear User profile fields
      await User.updateOne(
        { _id: userId },
        { $set: { villaId: null, residencyType: 'None', roleId: null, roleIds: [] } }
      ).session(session);

      // 4. Clear OrgMembership fields
      await OrgMembership.updateOne(
        { userId, orgId },
        { $set: { villaId: null, residentType: 'None', roleId: null, roleIds: [] } }
      ).session(session);

      await session.commitTransaction();
      logger.info(`Successfully removed resident from unit`, { villaId, userId, correlationId });

      // Emit events outside transaction
      villaEvents.emit('unit_updated', villa);
      villaEvents.emit('resident_assigned', { villaId: villa._id, orgId, residentId: null });

      return villa;
    } catch (error) {
      logger.error(`Failed to remove resident, aborting transaction. Error: ${error.message}`, { villaId, userId, correlationId });
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getUnitsByVillaIds(ids, session = null) {
    return await Villa.find({ _id: { $in: ids } }).session(session);
  }

  async getUnitsByOrgId(orgId, session = null) {
    return await Villa.find({ orgId }).session(session);
  }

  async getUnitsByOwner(ownerId, session = null) {
    return await Villa.find({
      residents: {
        $elemMatch: {
          userId: ownerId,
          residencyType: { $in: ['Resident Owner', 'Non-Resident Owner'] }
        }
      }
    }).session(session);
  }

  async getUnitsByResidentUserIds(userIds, session = null) {
    return await Villa.find({
      'residents.userId': { $in: userIds }
    }).session(session);
  }

  async getUnitsByBlockNames(blockNames, orgId, session = null) {
    return await Villa.find({
      orgId,
      $or: [
        { blockOrBuilding: { $in: blockNames } },
        { block: { $in: blockNames } }
      ]
    }).session(session);
  }

  async getUnitsByTypes(types, orgId, session = null) {
    return await Villa.find({
      orgId,
      type: { $in: types }
    }).session(session);
  }
}

export default new VillaService();
