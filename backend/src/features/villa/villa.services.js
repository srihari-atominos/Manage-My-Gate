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
        const residentObjId = mongoose.Types.ObjectId.isValid(residentId) ? new mongoose.Types.ObjectId(residentId) : null;
        if (!residentObjId) {
          throw new HttpError(400, `Invalid resident ID format: ${residentId}`);
        }

        let membership = await OrgMembership.findOne({ userId: residentObjId, orgId }).session(session);
        if (!membership) {
          throw new HttpError(400, `User with ID ${residentId} is not a member of this organization.`);
        }

        membership.units = membership.units || [];
        const unitIndex = membership.units.findIndex(u => {
          const uId = u.villaId?._id ? u.villaId._id.toString() : (u.villaId?.toString ? u.villaId.toString() : String(u.villaId));
          return uId === villa._id.toString();
        });

        if (unitIndex === -1) {
          membership.units.push({
            villaId: villa._id,
            residentType: membership.residentType && membership.residentType !== 'None' ? membership.residentType : 'Owner'
          });
        }
        membership.villaId = villa._id;
        if (membership.residentType === 'None' || !membership.residentType) {
          membership.residentType = 'Owner';
        }
        await membership.save({ session });

        // Update villa residents array
        const existingResidentIndex = villa.residents.findIndex(r => {
          const rId = r.userId?._id ? r.userId._id.toString() : (r.userId?.toString ? r.userId.toString() : String(r.userId));
          return rId === residentObjId.toString();
        });

        villa.residents.forEach(r => {
          r.isPrimary = false;
        });

        if (existingResidentIndex === -1) {
          villa.residents.push({
            userId: residentObjId,
            residencyType: membership.residentType || 'Owner',
            isPrimary: true,
            assignedAt: new Date()
          });
        } else {
          villa.residents[existingResidentIndex].isPrimary = true;
        }

        villa.primaryResidentId = residentObjId;
        villa.status = 'Occupied';
      } else {
        // Clear primary resident
        villa.primaryResidentId = null;
        villa.residents.forEach(r => {
          r.isPrimary = false;
        });
        if (villa.residents.length === 0) {
          villa.status = 'Vacant';
        }
      }

      await villa.save({ session });
      await villa.populate('residents.userId', 'name email phone login');

      await session.commitTransaction();
      logger.info(`Successfully assigned resident and updated unit status`, { id, residentId, correlationId });

      // Emit events outside transaction
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

  async bulkUploadVillasAndResidents(villasArray, orgId, invitationSource = 'WEB') {
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

            await userService.inviteUser(trimmedEmail, orgId, villa._id, normalizedResidentType, finalRoleName, phone, name, invitationSource);
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

  async assignExistingUser(villaId, userId, residencyType, orgId, isPrimary = false) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`assignExistingUser request received`, { villaId, userId, residencyType, isPrimary, orgId, correlationId });

    if (!orgId) throw new HttpError(400, 'Organization ID (orgId) is required.');
    if (!userId) throw new HttpError(400, 'User ID (userId) is required.');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get the unit
      const villa = await villaRepository.findById(villaId, orgId, session);
      if (!villa) {
        throw new HttpError(404, `Unit with ID ${villaId} not found.`);
      }

      // 2. Resolve User
      const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
      if (!userObjId) {
        throw new HttpError(400, `Invalid User ID format: ${userId}`);
      }
      const user = await User.findById(userObjId).session(session);
      if (!user) {
        throw new HttpError(404, `User with ID ${userId} not found.`);
      }

      // 3. Resolve residency type and target role
      const mappedResidentType = (type) => {
        if (!type) return 'Tenant';
        const lower = String(type).toLowerCase();
        if (lower.includes('owner')) return 'Owner';
        if (lower.includes('family')) return 'Family';
        if (lower.includes('tenant') || lower.includes('resident')) return 'Tenant';
        if (lower.includes('staff')) return 'Staff';
        return 'Guest';
      };

      const resolveRoleName = (type) => {
        if (!type) return 'Resident Tenant';
        const lower = String(type).toLowerCase();
        if (lower.includes('owner')) return 'Resident Owner';
        if (lower.includes('family')) return 'Family Member';
        if (lower.includes('tenant') || lower.includes('resident')) return 'Resident Tenant';
        if (lower.includes('staff')) return 'Staff/Vendor';
        return type;
      };

      const targetRoleName = resolveRoleName(residencyType);
      const roleService = (await import('../role/role.services.js')).default;
      const roleObj = await roleService.getRoleByName(targetRoleName, orgId, session);

      // 4. Update villa residents array
      const existingResidentIndex = villa.residents.findIndex(r => {
        const rId = r.userId?._id ? r.userId._id.toString() : (r.userId?.toString ? r.userId.toString() : String(r.userId));
        return rId === userObjId.toString();
      });

      if (isPrimary) {
        villa.residents.forEach(r => {
          r.isPrimary = false;
        });
        villa.primaryResidentId = userObjId;
      }

      if (existingResidentIndex === -1) {
        villa.residents.push({
          userId: userObjId,
          residencyType,
          isPrimary: !!isPrimary,
          assignedAt: new Date()
        });
      } else {
        villa.residents[existingResidentIndex].residencyType = residencyType;
        if (isPrimary) {
          villa.residents[existingResidentIndex].isPrimary = true;
        }
      }

      // If no primary resident designated yet, default to this user
      if (!villa.primaryResidentId) {
        villa.primaryResidentId = userObjId;
        const targetRes = villa.residents.find(r => {
          const rId = r.userId?._id ? r.userId._id.toString() : (r.userId?.toString ? r.userId.toString() : String(r.userId));
          return rId === userObjId.toString();
        });
        if (targetRes) targetRes.isPrimary = true;
      }

      // If status is Vacant, mark as Occupied
      if (villa.status === 'Vacant') {
        villa.status = 'Occupied';
      }

      await villa.save({ session });
      await villa.populate('residents.userId', 'name email phone login');

      // 5. Update or Create OrgMembership (strictly 1 document per { userId, orgId })
      let membership = await OrgMembership.findOne({ userId: userObjId, orgId }).session(session);
      const targetResidentType = mappedResidentType(residencyType);

      if (!membership) {
        membership = new OrgMembership({
          userId: userObjId,
          orgId,
          status: 'Active',
          villaId: villa._id,
          residentType: targetResidentType,
          units: [{
            villaId: villa._id,
            residentType: targetResidentType
          }],
          roleId: roleObj ? roleObj._id : undefined,
          roleIds: roleObj ? [roleObj._id] : [],
        });
      } else {
        membership.units = membership.units || [];
        const unitIndex = membership.units.findIndex(u => {
          const uId = u.villaId?._id ? u.villaId._id.toString() : (u.villaId?.toString ? u.villaId.toString() : String(u.villaId));
          return uId === villa._id.toString();
        });

        if (unitIndex === -1) {
          membership.units.push({
            villaId: villa._id,
            residentType: targetResidentType
          });
        } else {
          membership.units[unitIndex].residentType = targetResidentType;
        }

        // Backward compatibility fields
        membership.villaId = villa._id;
        membership.residentType = targetResidentType;
        membership.status = 'Active';

        if (roleObj) {
          membership.roleId = roleObj._id;
          const currentRoleIds = Array.isArray(membership.roleIds) ? membership.roleIds.map(r => r.toString()) : [];
          if (!currentRoleIds.includes(roleObj._id.toString())) {
            membership.roleIds = [...(membership.roleIds || []), roleObj._id];
          }
        }
      }

      await membership.save({ session });

      // 6. Update User document with synced roles and residency (ObjectIds for roles, NOT strings)
      const userUpdateFields = {
        villaId: villa._id,
        residencyType
      };
      if (roleObj) {
        const existingRoles = Array.isArray(user.roles) ? user.roles.map(r => (r?._id || r).toString()) : [];
        if (!existingRoles.includes(roleObj._id.toString())) {
          userUpdateFields.roles = [...(user.roles || []), roleObj._id];
        }
      }
      await User.updateOne({ _id: userObjId }, { $set: userUpdateFields }).session(session);

      await session.commitTransaction();
      logger.info(`Successfully assigned existing user to unit`, { villaId, userId, residencyType, correlationId });

      // Emit events outside transaction
      villaEvents.emit('unit_updated', villa);
      villaEvents.emit('resident_assigned', { villaId: villa._id, orgId, userId: userObjId.toString(), residencyType, isPrimary });

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
      const residentIndex = villa.residents.findIndex(r => {
        const rId = r.userId?._id ? r.userId._id.toString() : (r.userId?.toString ? r.userId.toString() : String(r.userId));
        return rId === String(userId);
      });
      if (residentIndex === -1) {
        throw new HttpError(404, `User ${userId} is not assigned to unit ${villaId}.`);
      }
      villa.residents[residentIndex].residencyType = newResidencyType;
      await villa.save({ session });
      await villa.populate('residents.userId', 'name email phone login');

      // 3. Sync OrgMembership and User
      const mappedResidentType = (type) => {
        if (!type) return 'Guest';
        const lower = String(type).toLowerCase();
        if (lower.includes('owner')) return 'Owner';
        if (lower.includes('family')) return 'Family';
        if (lower.includes('tenant') || lower.includes('resident')) return 'Tenant';
        if (lower.includes('staff')) return 'Staff';
        return 'Guest';
      };

      const resolveRoleName = (type) => {
        if (!type) return 'Resident Tenant';
        const lower = String(type).toLowerCase();
        if (lower.includes('owner')) return 'Resident Owner';
        if (lower.includes('family')) return 'Family Member';
        if (lower.includes('tenant') || lower.includes('resident')) return 'Resident Tenant';
        if (lower.includes('staff')) return 'Staff/Vendor';
        return type;
      };

      const targetRoleName = resolveRoleName(newResidencyType);
      const roleService = (await import('../role/role.services.js')).default;
      const roleObj = await roleService.getRoleByName(targetRoleName, orgId, session);

      const targetUser = await User.findById(userId).session(session);
      if (targetUser) {
        const userUpdateFields = {
          residencyType: newResidencyType,
          villaId: villa._id
        };
        if (roleObj) {
          const currentRoles = Array.isArray(targetUser.roles) ? targetUser.roles.map(r => (r?._id || r).toString()) : [];
          if (!currentRoles.includes(roleObj._id.toString())) {
            userUpdateFields.roles = [...(targetUser.roles || []), roleObj._id];
          }
        }
        await User.updateOne({ _id: userId }, { $set: userUpdateFields }).session(session);
      }

      const membership = await OrgMembership.findOne({ userId, orgId }).session(session);
      if (membership) {
        const mResidentType = mappedResidentType(newResidencyType);
        membership.units = membership.units || [];
        const uIdx = membership.units.findIndex(u => {
          const uId = u.villaId?._id ? u.villaId._id.toString() : (u.villaId?.toString ? u.villaId.toString() : String(u.villaId));
          return uId === villa._id.toString();
        });
        if (uIdx !== -1) {
          membership.units[uIdx].residentType = mResidentType;
        } else {
          membership.units.push({ villaId: villa._id, residentType: mResidentType });
        }
        membership.residentType = mResidentType;
        membership.villaId = villa._id;
        if (roleObj) {
          membership.roleId = roleObj._id;
          const currentRoleIds = Array.isArray(membership.roleIds) ? membership.roleIds.map(r => r.toString()) : [];
          if (!currentRoleIds.includes(roleObj._id.toString())) {
            membership.roleIds = [...(membership.roleIds || []), roleObj._id];
          }
        }
        await membership.save({ session });
      }

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
      const residentToRemove = villa.residents.find(r => {
        const rId = r.userId?._id ? r.userId._id.toString() : (r.userId?.toString ? r.userId.toString() : String(r.userId));
        return rId === String(userId);
      });

      if (residentToRemove) {
        if (!villa.history) villa.history = [];
        villa.history.push({
          userId: residentToRemove.userId?._id || residentToRemove.userId,
          residencyType: residentToRemove.residencyType,
          moveInDate: residentToRemove.assignedAt || new Date(),
          moveOutDate: new Date()
        });
      }

      villa.residents = villa.residents.filter(r => {
        const rId = r.userId?._id ? r.userId._id.toString() : (r.userId?.toString ? r.userId.toString() : String(r.userId));
        return rId !== String(userId);
      });
      
      // If the removed user was primary, designate new primary if residents exist
      if (villa.primaryResidentId && String(villa.primaryResidentId) === String(userId)) {
        if (villa.residents.length > 0) {
          const nextPrimary = villa.residents.find(r => r.isPrimary) || villa.residents[0];
          nextPrimary.isPrimary = true;
          villa.primaryResidentId = nextPrimary.userId?._id || nextPrimary.userId;
        } else {
          villa.primaryResidentId = null;
        }
      }

      // If no residents remain, mark as Vacant
      if (villa.residents.length === 0) {
        villa.status = 'Vacant';
      }

      await villa.save({ session });
      await villa.populate('residents.userId', 'name email phone login');

      // 3. Update OrgMembership
      const membership = await OrgMembership.findOne({ userId, orgId }).session(session);
      if (membership) {
        membership.units = (membership.units || []).filter(u => {
          const uVillaId = u.villaId?._id ? u.villaId._id.toString() : (u.villaId?.toString ? u.villaId.toString() : String(u.villaId));
          return uVillaId !== villa._id.toString();
        });

        if (membership.units.length > 0) {
          const remainingUnit = membership.units[0];
          membership.villaId = remainingUnit.villaId;
          membership.residentType = remainingUnit.residentType;
        } else {
          membership.villaId = null;
          membership.residentType = 'None';
        }
        await membership.save({ session });

        // 4. Sync User Profile fields
        if (membership.units.length > 0) {
          await User.updateOne(
            { _id: userId },
            {
              $set: {
                villaId: membership.units[0].villaId,
                residencyType: membership.units[0].residentType
              }
            }
          ).session(session);
        } else {
          await User.updateOne(
            { _id: userId },
            { $set: { villaId: null, residencyType: 'None' } }
          ).session(session);
        }
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

  async getUnitsByVillaIds(ids, orgId = null, session = null) {
    const query = { _id: { $in: ids } };
    if (orgId) query.orgId = orgId;
    return await Villa.find(query).session(session);
  }

  async getUnitsByOrgId(orgId, session = null) {
    return await Villa.find({ orgId }).session(session);
  }

  async getUnitsByOwner(ownerId, orgId = null, session = null) {
    let effectiveOrgId = orgId;
    let effectiveSession = session;
    if (orgId && typeof orgId === 'object' && orgId.constructor && orgId.constructor.name === 'ClientSession') {
      effectiveSession = orgId;
      effectiveOrgId = null;
    }

    const query = {
      residents: {
        $elemMatch: {
          userId: ownerId,
          residencyType: { $in: ['Resident Owner', 'Non-Resident Owner'] }
        }
      }
    };
    if (effectiveOrgId) {
      query.orgId = effectiveOrgId;
    }
    return await Villa.find(query).session(effectiveSession);
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

  async assignResidentToVilla(villaId, userId, residencyType, session = null, orgId = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info(`assignResidentToVilla request received`, { villaId, userId, residencyType, correlationId });

    const query = { _id: villaId };
    if (orgId) query.orgId = orgId;
    const villa = await Villa.findOne(query).session(session);
    if (!villa) {
      throw new HttpError(404, 'Villa or unit not found.');
    }

    const alreadyAssigned = villa.residents.some(r => String(r.userId) === String(userId));
    const isDifferentPrimaryOccupant = villa.primaryResidentId && String(villa.primaryResidentId) !== String(userId);

    // If another primary resident already occupies the villa, reject conflicting primary assignment
    if (isDifferentPrimaryOccupant && !alreadyAssigned && (residencyType.includes('Owner') || residencyType.includes('Tenant') || residencyType === 'Resident')) {
      throw new HttpError(409, 'Villa is already assigned to another primary resident.');
    }

    // Atomic conditional update to prevent double-booking race condition
    const updateFilter = {
      _id: villaId,
      $or: [
        { primaryResidentId: null },
        { primaryResidentId: { $exists: false } },
        { primaryResidentId: userId },
        { 'residents.userId': userId }
      ]
    };
    if (orgId) updateFilter.orgId = orgId;

    const updateOps = {
      $set: { status: 'Occupied' }
    };

    if (!alreadyAssigned) {
      updateOps.$push = {
        residents: {
          userId,
          residencyType,
          isPrimary: !villa.primaryResidentId,
          assignedAt: new Date()
        }
      };
    }
    if (!villa.primaryResidentId) {
      updateOps.$set.primaryResidentId = userId;
    }
    if (!villa.ownerId && residencyType.includes('Owner')) {
      updateOps.$set.ownerId = userId;
    }

    const updatedVilla = await Villa.findOneAndUpdate(updateFilter, updateOps, { new: true, session });
    if (!updatedVilla && !alreadyAssigned) {
      throw new HttpError(409, 'Villa assignment conflict. The unit is already occupied.');
    }
  }
}

export default new VillaService();
