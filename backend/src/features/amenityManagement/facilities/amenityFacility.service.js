import HttpError from '../../../utils/httpError.utils.js';
import amenityFacilityRepository from './amenityFacility.repository.js';
import amenityResourceService from '../resources/amenityResource.service.js';
import { withTransactionRetry } from '../domain/concurrency/transaction.utils.js';

export class AmenityFacilityService {
  /**
   * Synchronizes child AmenityResource records for ROOM_RESOURCE sub-rooms within a session.
   *
   * @param {Object} facility
   * @param {Array} subRooms
   * @param {import('mongoose').ClientSession} session
   * @private
   */
  async _syncSubRooms(facility, subRooms, session) {
    if (!Array.isArray(subRooms) || facility.archetype !== 'ROOM_RESOURCE') {
      return;
    }

    const existing = await amenityResourceService.getResourcesByFacilityId(
      facility._id,
      facility.orgId,
      session
    );
    const existingMap = new Map();
    for (const res of existing) {
      existingMap.set(res.identifier, res);
      existingMap.set(res.name.toLowerCase(), res);
    }

    const processedIds = new Set();

    for (let i = 0; i < subRooms.length; i++) {
      const room = subRooms[i];
      if (!room || !room.name) continue;
      const cleanName = room.name.trim();
      const identifier = room.id
        ? `${facility.code}-${room.id.toUpperCase()}`
        : `${facility.code}-ROOM-${i + 1}`;

      const matched = existingMap.get(identifier) || existingMap.get(cleanName.toLowerCase());

      if (matched) {
        processedIds.add(matched._id.toString());
        await amenityResourceService.updateResource(
          matched._id,
          facility.orgId,
          {
            name: cleanName,
            totalBulkStock: room.capacity || 1,
            isActive: !facility.isDraft,
          },
          session
        );
      } else {
        const created = await amenityResourceService.createResource(
          {
            orgId: facility.orgId,
            facilityId: facility._id,
            name: cleanName,
            identifier,
            totalBulkStock: room.capacity || 1,
            isActive: !facility.isDraft,
          },
          session
        );
        processedIds.add(created._id.toString());
      }
    }

    // Soft-delete removed sub-rooms
    for (const res of existing) {
      if (!processedIds.has(res._id.toString())) {
        await amenityResourceService.softDeleteResource(res._id, facility.orgId, session);
      }
    }
  }

  /**
   * Creates a new amenity facility document.
   * Enforces unique uppercase facility code within tenant organization.
   * Atomically provisions child sub-rooms if ROOM_RESOURCE archetype.
   *
   * @param {Object} facilityData
   * @param {import('mongoose').ClientSession} [session]
   */
  async createFacility(facilityData, session) {
    if (!facilityData.orgId || !facilityData.name || !facilityData.code || !facilityData.archetype) {
      throw new HttpError(400, 'orgId, name, code, and archetype are required to create a facility');
    }

    const normalizedCode = facilityData.code.trim().toUpperCase();
    const isDraft = Boolean(facilityData.isDraft === true || facilityData.status === 'DRAFT');
    const status = isDraft ? 'DRAFT' : (facilityData.status || 'ACTIVE');
    const isActive = isDraft ? false : (facilityData.isActive !== false);

    const payload = {
      ...facilityData,
      code: normalizedCode,
      isDraft,
      status,
      isActive,
    };

    const executeCreate = async (trxSession) => {
      const existing = await amenityFacilityRepository.findByCode(
        payload.orgId,
        normalizedCode,
        trxSession
      );

      if (existing) {
        throw new HttpError(409, `Facility with code '${normalizedCode}' already exists in this organization`);
      }

      const facility = await amenityFacilityRepository.create(payload, trxSession);

      if (payload.archetype === 'ROOM_RESOURCE' && Array.isArray(payload.subRooms) && payload.subRooms.length > 0) {
        await this._syncSubRooms(facility, payload.subRooms, trxSession);
      }

      return facility;
    };

    if (session) {
      return executeCreate(session);
    }
    return withTransactionRetry(executeCreate);
  }

  /**
   * Retrieves a facility by ID.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} [orgId]
   * @param {import('mongoose').ClientSession} [session]
   */
  async getFacilityById(facilityId, orgId, session) {
    const facility = await amenityFacilityRepository.findById(facilityId, orgId, session);
    if (!facility) {
      throw new HttpError(404, 'Facility not found');
    }
    return facility;
  }

  /**
   * Retrieves a facility by code.
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {string} code
   * @param {import('mongoose').ClientSession} [session]
   */
  async getFacilityByCode(orgId, code, session) {
    const facility = await amenityFacilityRepository.findByCode(orgId, code, session);
    if (!facility) {
      throw new HttpError(404, `Facility with code '${code}' not found`);
    }
    return facility;
  }

  /**
   * Updates an existing facility.
   * Atomically synchronizes child sub-room resources for ROOM_RESOURCE archetype.
   *
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {Object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateFacility(facilityId, orgId, updateData, session) {
    const executeUpdate = async (trxSession) => {
      if (updateData.code) {
        const normalizedCode = updateData.code.trim().toUpperCase();
        const existing = await amenityFacilityRepository.findByCode(orgId, normalizedCode, trxSession);
        if (existing && existing._id.toString() !== facilityId.toString()) {
          throw new HttpError(409, `Facility with code '${normalizedCode}' already exists`);
        }
        updateData.code = normalizedCode;
      }

      // Handle draft status transitions
      if (updateData.status === 'ACTIVE' || updateData.isDraft === false) {
        updateData.isDraft = false;
        updateData.status = 'ACTIVE';
        updateData.isActive = true;
      } else if (updateData.status === 'DRAFT' || updateData.isDraft === true) {
        updateData.isDraft = true;
        updateData.status = 'DRAFT';
        updateData.isActive = false;
      }

      const updated = await amenityFacilityRepository.update(facilityId, orgId, updateData, trxSession);
      if (!updated) {
        throw new HttpError(404, 'Facility not found');
      }

      if (updated.archetype === 'ROOM_RESOURCE' && Array.isArray(updateData.subRooms)) {
        await this._syncSubRooms(updated, updateData.subRooms, trxSession);
      }

      return updated;
    };

    if (session) {
      return executeUpdate(session);
    }
    return withTransactionRetry(executeUpdate);
  }

  /**
   * Soft deletes a facility and its associated child resources.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDeleteFacility(facilityId, orgId, session) {
    const executeDelete = async (trxSession) => {
      const deleted = await amenityFacilityRepository.softDelete(facilityId, orgId, trxSession);
      if (!deleted) {
        throw new HttpError(404, 'Facility not found');
      }

      // Cascade soft delete to child resources if any
      const resources = await amenityResourceService.getResourcesByFacilityId(facilityId, orgId, trxSession);
      for (const res of resources) {
        await amenityResourceService.softDeleteResource(res._id, orgId, trxSession);
      }

      return deleted;
    };

    if (session) {
      return executeDelete(session);
    }
    return withTransactionRetry(executeDelete);
  }

  /**
   * Lists facilities with pagination and filter criteria using $facet aggregation pipeline.
   * @param {Object} queryParams
   */
  async listFacilities(queryParams) {
    return amenityFacilityRepository.findWithPagination(queryParams);
  }
}

export const amenityFacilityService = new AmenityFacilityService();
export default amenityFacilityService;
