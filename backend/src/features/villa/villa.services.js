import mongoose from 'mongoose';
import villaRepository from './villa.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import villaEvents from './villa.events.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';
import User from '../user/user.model.js';
import Villa from './villa.model.js';

export class VillaService {
  async checkVillaExists(villaNumber, organisationId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`checkVillaExists request received`, { villaNumber, organisationId, correlationId });

    if (!organisationId) throw new HttpError(400, 'Organization ID (organisationId) is required.');
    if (!villaNumber) return false;

    const trimmedNumber = String(villaNumber).trim();
    const existing = await villaRepository.findByUnitNumber(trimmedNumber, organisationId, session);
    return !!existing;
  }

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

  async createVilla(orgId, villaData, session = null) {
    return await this.createUnit(orgId, villaData, session);
  }

  async createUnit(orgId, unitData, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`createUnit request received`, { orgId, unitNumber: unitData?.unitNumber, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    if (!unitData || !unitData.unitNumber) throw new HttpError(400, 'Unit number is required.');

    const trimmedNumber = unitData.unitNumber.trim();
    const blockOrBuilding = unitData.blockOrBuilding ? unitData.blockOrBuilding.trim() : '';
    const existing = await villaRepository.findByUnitNumber(trimmedNumber, orgId, blockOrBuilding, session);
    if (existing) {
      throw new HttpError(409, `Conflict. Unit number "${trimmedNumber}" already exists in ${blockOrBuilding || 'this community'}.`);
    }

    const villa = await villaRepository.create(orgId, { ...unitData, unitNumber: trimmedNumber, blockOrBuilding }, session);
    
    // Emit native event bus event
    villaEvents.emit('unit_created', villa);
    
    return villa;
  }

  async updateUnit(id, orgId, updateData, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`updateUnit request received`, { id, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await this.getUnitById(id, orgId, session);

    // If unit number or block is changing, verify uniqueness
    const newUnitNumber = updateData.unitNumber ? updateData.unitNumber.trim() : villa.unitNumber;
    const newBlock = updateData.blockOrBuilding !== undefined ? updateData.blockOrBuilding.trim() : villa.blockOrBuilding;

    if (newUnitNumber !== villa.unitNumber || newBlock !== villa.blockOrBuilding) {
      const existing = await villaRepository.findByUnitNumber(newUnitNumber, orgId, newBlock, session);
      if (existing && String(existing._id) !== String(id)) {
        throw new HttpError(409, `Conflict. Unit number "${newUnitNumber}" already exists in ${newBlock || 'this community'}.`);
      }
      updateData.unitNumber = newUnitNumber;
      updateData.blockOrBuilding = newBlock;
    }

    const updatedVilla = await villaRepository.update(id, orgId, updateData, session);
    
    villaEvents.emit('unit_updated', updatedVilla);
    
    return updatedVilla;
  }

  async deleteUnit(id, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`deleteUnit request received`, { id, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    const villa = await villaRepository.findById(id, orgId, session);

    if (!villa) {
      // Mock unit fallback in local development if unit does not exist in DB yet
      return { id, deleted: true };
    }

    // Unlink any residents or memberships associated with this unit before deletion
    try {
      const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
      await OrgMembership.updateMany(
        { orgId, villaId: id },
        { $unset: { villaId: "" }, $pull: { units: { villaId: id } } }
      ).catch(() => {});
    } catch (e) {
      logger.warn('Failed to unassign memberships during unit deletion', { id, error: e.message });
    }

    const deleted = await villaRepository.delete(id, orgId, session);
    villaEvents.emit('unit_deleted', { id, orgId });
    return deleted || { id, deleted: true };
  }

  async deactivateUnit(id, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`deactivateUnit request received`, { id, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    await this.getUnitById(id, orgId, session);

    const deactivated = await villaRepository.update(id, orgId, { status: 'Inactive' }, session);
    villaEvents.emit('unit_updated', deactivated);
    return deactivated;
  }

  async getUnitsPaginated({ orgId, page = 1, limit = 10, search, ...filters }, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`getUnitsPaginated request received`, { orgId, page, limit, search, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    
    const { data, total } = await villaRepository.findPaginated(
      { orgId, page, limit, search, ...filters },
      session
    );
    
    // Populate residents so frontend can display names and emails
    await Villa.populate(data, { path: 'residents.userId', select: 'name email phone username login' });

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
        let membership = await OrgMembership.findOne({ userId: residentId, orgId, villaId: villa._id }).session(session);
        if (!membership) {
          const emptyMembership = await OrgMembership.findOne({ userId: residentId, orgId, $or: [{ villaId: null }, { villaId: { $exists: false } }] }).session(session);
          if (emptyMembership) {
            membership = emptyMembership;
            membership.villaId = villa._id;
            if (membership.residentType === 'None') {
              membership.residentType = 'Owner';
            }
          } else {
            const baseMembership = await OrgMembership.findOne({ userId: residentId, orgId }).session(session);
            if (!baseMembership) {
              throw new HttpError(400, `User with ID ${residentId} is not a member of this organization.`);
            }
            membership = new OrgMembership({
              userId: residentId,
              orgId,
              villaId: villa._id,
              residentType: 'Owner',
              status: 'Active',
              roleId: baseMembership.roleId,
              roleIds: baseMembership.roleIds || [],
            });
          }
        } else {
          if (membership.residentType === 'None') {
            membership.residentType = 'Owner';
          }
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

    const villa = await Villa.findOne({ _id: id, orgId }).session(session);
    if (!villa) {
      throw new HttpError(404, `Unit with ID ${id} not found.`);
    }

    const originalUserIds = (villa.residents || []).map(r => r.userId?.toString());
    await villa.populate('residents.userId');

    const mappedResidents = (villa.residents || []).map((r, i) => ({
      id: r.userId?._id?.toString() || originalUserIds[i],
      name: r.userId?.name || r.userId?.username || 'Deleted User',
      email: r.userId?.email || 'deleted@user.com',
      phone: r.userId?.phone || '',
      status: r.userId?.status || 'Unknown',
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
      const targetBlock = config.blockOrBuilding ? config.blockOrBuilding.trim() : '';
      for (let i = startNumber; i <= endNumber; i++) {
        const numStr = i < 10 ? `0${i}` : `${i}`;
        const unitNumber = prefix ? `${prefix.trim()} ${numStr}` : numStr;

        const existing = await villaRepository.findByUnitNumber(unitNumber, orgId, targetBlock, session);
        if (existing) continue;

        const villa = await villaRepository.create(orgId, {
          unitNumber,
          blockOrBuilding: targetBlock,
          floor: config.floor !== undefined && config.floor !== null ? String(config.floor) : '',
          type: config.type || 'Apartment',
          status: config.status || 'Vacant',
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
      const { unitNumber, blockOrBuilding = '', floor = '', type = 'Apartment', status = 'Vacant', floorAreaSqFt = null, email, name = '', residentType = 'None', roleName, phone = '' } = item;
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

      // Normalize Unit Type & Occupancy Status
      let normalizedType = type || 'Apartment';
      if (['1BHA', '1BHK', '1 BHK'].includes(normalizedType)) normalizedType = 'BHK1';
      else if (['2BHA', '2BHK', '2 BHK'].includes(normalizedType)) normalizedType = 'BHK2';
      else if (['3BHA', '3BHK', '3 BHK'].includes(normalizedType)) normalizedType = 'BHK3';
      else if (['4BHA', '4BHK', '4 BHK'].includes(normalizedType)) normalizedType = 'BHK4';

      let normalizedStatus = status || 'Vacant';
      if (normalizedStatus.toLowerCase().includes('occupied')) normalizedStatus = 'Occupied';
      else if (normalizedStatus.toLowerCase().includes('maintenance')) normalizedStatus = 'Under Maintenance';
      else normalizedStatus = 'Vacant';

      try {
        let villa = await villaRepository.findByUnitNumber(trimmedNumber, orgId, blockOrBuilding);
        let action = 'Created';

        if (villa) {
          const updateData = {};
          if (blockOrBuilding) updateData.blockOrBuilding = blockOrBuilding;
          if (floor) updateData.floor = floor;
          if (type) updateData.type = normalizedType;
          if (status) updateData.status = normalizedStatus;
          if (floorAreaSqFt !== null && floorAreaSqFt !== undefined) updateData.floorAreaSqFt = floorAreaSqFt;
          
          villa = await villaRepository.update(villa._id, orgId, updateData);
          action = 'Updated';
        } else {
          villa = await villaRepository.create(orgId, {
            unitNumber: trimmedNumber,
            blockOrBuilding,
            floor,
            type: normalizedType,
            status: normalizedStatus,
            floorAreaSqFt
          });
        }

        let userInvited = false;
        let inviteError = null;

        if (trimmedEmail) {
          try {
            let normalizedResidentType = residentType ? residentType.trim() : 'Resident Tenant';
            if (normalizedResidentType.toLowerCase().includes('owner')) normalizedResidentType = 'Resident Owner';
            else if (normalizedResidentType.toLowerCase().includes('tenant') || normalizedResidentType.toLowerCase().includes('resident')) normalizedResidentType = 'Resident Tenant';
            else if (normalizedResidentType.toLowerCase().includes('family')) normalizedResidentType = 'Family Member';
            else normalizedResidentType = 'Resident Tenant';

            let finalRoleName = roleName ? roleName.trim() : null;
            if (!finalRoleName) {
              finalRoleName = normalizedResidentType;
            }

            await userService.inviteUser(trimmedEmail, orgId, villa._id, normalizedResidentType, finalRoleName, phone, name);
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

      // 2. Verify the user is a member of the organization if userId is a valid Mongo ObjectId
      if (mongoose.Types.ObjectId.isValid(userId)) {
        const hasMembership = await OrgMembership.exists({ userId, orgId }).session(session);
        if (!hasMembership) {
          logger.warn(`User ${userId} membership check failed for org ${orgId}`);
        }
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

      // 4. Update or Create OrgMembership
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

      let membership = await OrgMembership.findOne({ userId, orgId, villaId: villa._id }).session(session);
      if (!membership) {
        // Look for an unassigned membership to reuse
        const emptyMembership = await OrgMembership.findOne({ userId, orgId, $or: [{ villaId: null }, { villaId: { $exists: false } }] }).session(session);
        if (emptyMembership) {
          membership = emptyMembership;
          membership.villaId = villa._id;
          membership.residentType = mappedResidentType(residencyType);
        } else {
          // Clone details from base membership to preserve roles/status
          const baseMembership = await OrgMembership.findOne({ userId, orgId }).session(session);
          membership = new OrgMembership({
            userId,
            orgId,
            villaId: villa._id,
            residentType: mappedResidentType(residencyType),
            status: 'Active',
            roleId: baseMembership?.roleId,
            roleIds: baseMembership?.roleIds || [],
          });
        }
      } else {
        membership.residentType = mappedResidentType(residencyType);
      }

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
        { userId, orgId, villaId },
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

      // 2. Record historical assignment before pulling resident from array
      const residentToRemove = villa.residents.find(r => String(r.userId) === String(userId));
      if (residentToRemove) {
        if (!villa.history) villa.history = [];
        villa.history.push({
          userId: residentToRemove.userId,
          residencyType: residentToRemove.residencyType,
          moveInDate: residentToRemove.assignedAt || new Date(),
          moveOutDate: new Date()
        });
      }

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

      // 3. Update OrgMembership
      const otherMembershipsCount = await OrgMembership.countDocuments({
        userId,
        orgId,
        villaId: { $nin: [villaId, null] }
      }).session(session);

      let remainingMembership = null;
      if (otherMembershipsCount > 0) {
        // Safe to delete the membership document for this specific unit
        await OrgMembership.deleteOne({ userId, orgId, villaId }).session(session);
        
        // Find one of the remaining memberships to sync the user profile with
        remainingMembership = await OrgMembership.findOne({
          userId,
          orgId,
          villaId: { $nin: [villaId, null] }
        }).session(session);
      } else {
        // This was the only unit, clear it instead of deleting membership to keep user in the organization
        await OrgMembership.updateOne(
          { userId, orgId, villaId },
          { $set: { villaId: null, residentType: 'None', roleId: null, roleIds: [], units: [] } }
        ).session(session);
      }

      // 4. Sync User Profile fields
      if (remainingMembership) {
        const getResidencyTypeFromMemberType = (type) => {
          switch (type) {
            case 'Owner': return 'Resident Owner';
            case 'Tenant': return 'Tenant';
            case 'Family': return 'Family Member';
            default: return 'None';
          }
        };
        await User.updateOne(
          { _id: userId },
          {
            $set: {
              villaId: remainingMembership.villaId || null,
              residencyType: getResidencyTypeFromMemberType(remainingMembership.residentType),
              roleId: remainingMembership.roleId || null,
              roleIds: remainingMembership.roleIds || []
            }
          }
        ).session(session);
      } else {
        // No remaining unit memberships in this organization
        await User.updateOne(
          { _id: userId },
          { $set: { villaId: null, residencyType: 'None', roleId: null, roleIds: [] } }
        ).session(session);
      }

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
      $or: [
        { 'residents.userId': { $in: userIds } },
        { ownerId: { $in: userIds } },
        { primaryResidentId: { $in: userIds } },
      ],
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

  async removeUserFromAllVillasInOrg(userId, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`removeUserFromAllVillasInOrg request received`, { userId, orgId, correlationId });
    
    const villas = await Villa.find({
      orgId,
      $or: [
        { 'residents.userId': userId },
        { primaryResidentId: userId },
        { ownerId: userId }
      ]
    }).session(session);

    for (const villa of villas) {
      villa.residents = villa.residents.filter(r => String(r.userId) !== String(userId));
      
      if (villa.primaryResidentId && String(villa.primaryResidentId) === String(userId)) {
        villa.primaryResidentId = null;
      }
      
      if (villa.ownerId && String(villa.ownerId) === String(userId)) {
        villa.ownerId = null;
      }

      if (villa.residents.length === 0) {
        villa.status = 'Vacant';
      }

      await villa.save({ session });
      villaEvents.emit('unit_updated', villa);
    }
  }

  async assignResidentToVilla(villaId, userId, residencyType, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`assignResidentToVilla request received`, { villaId, userId, residencyType, correlationId });

    const villa = await Villa.findById(villaId).session(session);
    if (villa) {
      const alreadyAssigned = villa.residents.some(r => String(r.userId) === String(userId));
      if (!alreadyAssigned) {
        villa.residents.push({
          userId,
          residencyType,
          isPrimary: !villa.primaryResidentId,
          assignedAt: new Date()
        });
      }

      // Update primary and owner IDs if they are empty
      if (!villa.primaryResidentId) {
        villa.primaryResidentId = userId;
      }
      if (!villa.ownerId && residencyType.includes('Owner')) {
        villa.ownerId = userId;
      }

      // Update occupancy status
      if (residencyType.includes('Owner') || residencyType.includes('Tenant') || residencyType.includes('Family')) {
        villa.status = 'Occupied';
      } else if (villa.status === 'Vacant') {
        villa.status = 'Occupied';
      }

      await villa.save({ session });
    }
  }
}

export default new VillaService();
