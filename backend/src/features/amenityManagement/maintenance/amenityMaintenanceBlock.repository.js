import mongoose from 'mongoose';
import AmenityMaintenanceBlock from './amenityMaintenanceBlock.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityMaintenanceBlockRepository {
  /**
   * Creates a new maintenance block document.
   * @param {Object} blockData
   * @param {mongoose.ClientSession} [session]
   */
  async create(blockData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityMaintenanceBlock.create([blockData], options);
    return doc;
  }

  /**
   * Finds block by ID.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {mongoose.ClientSession} [session]
   */
  async findById(blockId, orgId, session) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceBlock.findOne(filter).session(getValidSession(session));
  }

  /**
   * Finds active maintenance blocks overlapping a given time interval,
   * accounting for resource targeting (single, multi, or facility-wide)
   * and operational buffer blackout windows.
   *
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} [params.facilityId]
   * @param {string|mongoose.Types.ObjectId} [params.resourceId]
   * @param {Array<string|mongoose.Types.ObjectId>} [params.resourceIds]
   * @param {Date|string} params.startDateTime
   * @param {Date|string} params.endDateTime
   * @param {mongoose.ClientSession} [session]
   */
  async findOverlappingBlocks(
    { orgId, facilityId, resourceId, resourceIds, startDateTime, endDateTime },
    session
  ) {
    const qStart = new Date(startDateTime).getTime();
    const qEnd = new Date(endDateTime).getTime();
    const MAX_BUFFER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24hr upper envelope for index scan

    const filter = {
      orgId,
      status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
      startDateTime: { $lt: new Date(qEnd + MAX_BUFFER_WINDOW_MS) },
      endDateTime: { $gt: new Date(qStart - MAX_BUFFER_WINDOW_MS) },
    };

    if (facilityId) {
      filter.facilityId = facilityId;
    }

    const targetResourceIds = Array.isArray(resourceIds) && resourceIds.length > 0
      ? resourceIds.map(String)
      : (resourceId ? [String(resourceId)] : []);

    if (targetResourceIds.length > 0) {
      filter.$or = [
        { resourceId: { $in: targetResourceIds } },
        { resourceIds: { $in: targetResourceIds } },
        {
          facilityId,
          resourceId: null,
          $or: [{ resourceIds: { $exists: false } }, { resourceIds: { $size: 0 } }],
        },
      ];
    }

    const blocks = await AmenityMaintenanceBlock.find(filter).session(getValidSession(session));

    // Refine with exact effective buffer window
    return blocks.filter((b) => {
      const bBufBefore = (b.bufferBeforeMinutes || 0) * 60000;
      const bBufAfter = (b.bufferAfterMinutes || 0) * 60000;
      const bEffectiveStart = new Date(b.startDateTime).getTime() - bBufBefore;
      const bEffectiveEnd = new Date(b.endDateTime).getTime() + bBufAfter;
      return bEffectiveStart < qEnd && bEffectiveEnd > qStart;
    });
  }

  /**
   * Updates maintenance block status.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {string} status
   * @param {mongoose.ClientSession} [session]
   */
  async updateStatus(blockId, orgId, status, session, completionData = {}) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    const update = { status };
    if (status === 'COMPLETED') {
      const now = completionData?.actualCompletedAt ? new Date(completionData.actualCompletedAt) : new Date();
      update.actualCompletedAt = now;
      if (completionData?.completedBy) {
        update.completedBy = completionData.completedBy;
      }
      if (completionData?.completionNotes) {
        update.completionNotes = completionData.completionNotes;
      }
    }
    return AmenityMaintenanceBlock.findOneAndUpdate(
      filter,
      { $set: update },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Extends maintenance block end datetime.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {Date} newEndDateTime
   * @param {mongoose.ClientSession} [session]
   */
  async extend(blockId, orgId, newEndDateTime, session) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceBlock.findOneAndUpdate(
      filter,
      { $set: { endDateTime: newEndDateTime } },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Lists maintenance blocks for an organization with optional filtering.
   * @param {Object} params
   * @param {mongoose.ClientSession} [session]
   */
  async list({ orgId, facilityId, status, page = 1, limit = 50 }, session) {
    const filter = { orgId };
    if (facilityId) filter.facilityId = facilityId;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const validSession = getValidSession(session);
    const [records, total] = await Promise.all([
      AmenityMaintenanceBlock.find(filter)
        .sort({ startDateTime: -1 })
        .skip(skip)
        .limit(limit)
        .session(validSession),
      AmenityMaintenanceBlock.countDocuments(filter).session(validSession),
    ]);
    return { records, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Bulk creates multiple maintenance block occurrence documents in a session.
   * @param {Array<Object>} blocksData
   * @param {mongoose.ClientSession} [session]
   */
  async createMany(blocksData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    return AmenityMaintenanceBlock.create(blocksData, options);
  }

  /**
   * Finds all occurrence blocks for a given recurring series.
   * @param {string|mongoose.Types.ObjectId} seriesId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session]
   */
  async findBySeriesId(seriesId, orgId, session) {
    const filter = { recurrenceSeriesId: seriesId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceBlock.find(filter)
      .sort({ occurrenceIndex: 1, startDateTime: 1 })
      .session(getValidSession(session));
  }

  /**
   * Lists occurrence blocks for a recurring series with pagination.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.seriesId
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=50]
   * @param {mongoose.ClientSession} [session]
   */
  async listSeriesOccurrences({ seriesId, orgId, page = 1, limit = 50 }, session) {
    const filter = { recurrenceSeriesId: seriesId };
    if (orgId) filter.orgId = orgId;
    const skip = (page - 1) * limit;
    const validSession = getValidSession(session);
    const [records, total] = await Promise.all([
      AmenityMaintenanceBlock.find(filter)
        .sort({ occurrenceIndex: 1, startDateTime: 1 })
        .skip(skip)
        .limit(limit)
        .session(validSession),
      AmenityMaintenanceBlock.countDocuments(filter).session(validSession),
    ]);
    return { records, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Deletes maintenance block by ID within organization.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {mongoose.ClientSession} [session]
   */
  async deleteById(blockId, orgId, session) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceBlock.findOneAndDelete(filter).session(getValidSession(session));
  }

  /**
   * Finds maintenance blocks for calendar within a date range with optional filtering.
   * Matches blocks overlapping [startDate, endDate].
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|Date} [params.startDate]
   * @param {string|Date} [params.endDate]
   * @param {string|mongoose.Types.ObjectId} [params.facilityId]
   * @param {string|mongoose.Types.ObjectId} [params.resourceId]
   * @param {string} [params.status]
   * @param {mongoose.ClientSession} [session]
   */
  async findBlocksForCalendar(
    {
      orgId,
      startDate,
      endDate,
      facilityId,
      resourceId,
      status,
    },
    session
  ) {
    const filter = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = String(endDate).includes('T')
        ? new Date(endDate)
        : new Date(`${endDate}T23:59:59.999Z`);
      filter.startDateTime = { $lt: rangeEnd };
      filter.endDateTime = { $gt: rangeStart };
    } else if (startDate) {
      const rangeStart = new Date(startDate);
      filter.endDateTime = { $gt: rangeStart };
    } else if (endDate) {
      const rangeEnd = String(endDate).includes('T')
        ? new Date(endDate)
        : new Date(`${endDate}T23:59:59.999Z`);
      filter.startDateTime = { $lt: rangeEnd };
    }

    if (facilityId && facilityId !== 'All') {
      filter.facilityId = new mongoose.Types.ObjectId(facilityId);
    }
    if (resourceId && resourceId !== 'All') {
      const resId = new mongoose.Types.ObjectId(resourceId);
      filter.$or = [
        { resourceId: resId },
        { resourceIds: resId },
        { resourceId: null, $or: [{ resourceIds: { $exists: false } }, { resourceIds: { $size: 0 } }] },
      ];
    }
    if (status && status !== 'All') {
      filter.status = status.toUpperCase();
    }

    return AmenityMaintenanceBlock.find(filter)
      .populate('facilityId', 'name type images location category')
      .populate('resourceId', 'name type')
      .populate('resourceIds', 'name type')
      .populate('completedBy', 'name username email')
      .sort({ startDateTime: 1 })
      .session(getValidSession(session))
      .lean();
  }
}

export const amenityMaintenanceBlockRepository = new AmenityMaintenanceBlockRepository();
export default amenityMaintenanceBlockRepository;
