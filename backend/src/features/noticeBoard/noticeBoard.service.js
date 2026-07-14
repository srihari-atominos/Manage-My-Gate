import mongoose from 'mongoose';
import noticeRepository from './noticeBoard.repository.js';
import noticeEvents from './noticeBoard.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class NoticeBoardService {
  /**
   * Retrieves a notice by ID.
   */
  async getNoticeById(id, session) {
    const notice = await noticeRepository.findById(id, session);
    if (!notice) {
      throw new HttpError(404, `Notice with ID ${id} not found.`);
    }

    // Automatically check expiry if it is Published but current time is past expiryDate
    if (notice.status === 'Published' && notice.expiryDate <= new Date()) {
      notice.status = 'Expired';
      await notice.save({ session });
    }

    return notice;
  }

  /**
   * Creates a new notice.
   */
  async createNotice(noticeData, userId, orgId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Normalize and sanitize inputs
      const data = {
        ...noticeData,
        orgId,
        createdBy: userId,
        title: noticeData.title.trim(),
        description: noticeData.description.trim(),
        image: noticeData.image || '',
        scheduleDate: noticeData.scheduleDate ? new Date(noticeData.scheduleDate) : null,
      };

      // Set initial status to Published if not specified
      if (!data.status) {
        data.status = 'Published';
      }

      // If scheduled, check if scheduleDate is past. If yes, auto-publish
      if (data.status === 'Scheduled' && data.scheduleDate && data.scheduleDate <= new Date()) {
        data.status = 'Published';
      }

      // Check if it's already expired on creation
      if (data.status === 'Published' && new Date(data.expiryDate) <= new Date()) {
        data.status = 'Expired';
      }

      // Create the notice
      const notice = await noticeRepository.createNotice(data, session);

      // Handle single-pinned notice business rule
      if (notice.isPinned && notice.status === 'Published') {
        await noticeRepository.unpinAllExcept(orgId, notice._id, session);
      }

      await session.commitTransaction();

      // Emit event
      noticeEvents.emit('NOTICE_CREATED', notice);

      return notice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get all notices with pagination, filters, search, and sorting.
   */
  async getAllNotices(orgId, userId, page = 1, limit = 10, queryParams = {}, restrictToPublished = false) {
    const skip = (page - 1) * limit;
    const currentDate = new Date();

    // 1. Auto-publish scheduled notices whose dates have passed
    const Notice = mongoose.model('Notice');
    await Notice.updateMany(
      { orgId: new mongoose.Types.ObjectId(orgId), status: 'Scheduled', scheduleDate: { $lte: currentDate } },
      { status: 'Published' }
    );

    // 2. Automatically treat past-due notices as expired
    await noticeRepository.updateExpiredNotices(orgId, currentDate);

    // 3. Build filters
    const filters = {};

    if (restrictToPublished) {
      filters.status = 'Published';
    } else if (queryParams.status) {
      // If client requests All, don't filter by status
      if (queryParams.status !== 'All') {
        filters.status = queryParams.status;
      }
    }

    if (queryParams.category) {
      filters.category = queryParams.category;
    }

    if (queryParams.priority) {
      filters.priority = queryParams.priority;
    }

    if (queryParams.isPinned !== undefined && queryParams.isPinned !== '') {
      filters.isPinned = queryParams.isPinned === 'true';
    }

    if (queryParams.isBookmarked === 'true') {
      filters.bookmarkedBy = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    }

    if (queryParams.readStatus === 'Read') {
      filters.readBy = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    } else if (queryParams.readStatus === 'Unread') {
      filters.readBy = { $ne: typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId };
    }

    if (queryParams.search) {
      filters.$or = [
        { title: { $regex: queryParams.search.trim(), $options: 'i' } },
        { description: { $regex: queryParams.search.trim(), $options: 'i' } }
      ];
    }

    // 4. Define sorting logic
    let sort = { isPinned: -1, createdAt: -1 }; // default sorting: pinned first, then newest
    if (queryParams.sortBy) {
      const order = queryParams.sortOrder === 'asc' ? 1 : -1;
      if (queryParams.sortBy === 'expiryDate') {
        sort = { expiryDate: order, createdAt: -1 };
      } else if (queryParams.sortBy === 'priority') {
        sort = { priority: order, createdAt: -1 };
      } else if (queryParams.sortBy === 'createdAt') {
        sort = { createdAt: order };
      }
    }

    // 5. Query repository
    const { data, totalRecords } = await noticeRepository.getNotices(orgId, skip, limit, filters, sort);
    const totalPages = Math.ceil(totalRecords / limit);

    // 6. Map results to inject user-specific flags
    const mappedData = data.map(notice => {
      const readByList = notice.readBy || [];
      const bookmarkedByList = notice.bookmarkedBy || [];
      return {
        ...notice,
        isReadByUser: readByList.some(uid => uid.toString() === userId.toString()),
        isBookmarkedByUser: bookmarkedByList.some(uid => uid.toString() === userId.toString()),
        readerCount: readByList.length,
      };
    });

    return {
      data: mappedData,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: totalPages || 1,
        limit,
      },
    };
  }

  /**
   * Updates an existing notice.
   */
  async updateNotice(id, updateData, userId, orgId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const notice = await this.getNoticeById(id, session);

      // Verify that this notice belongs to the active organization
      if (notice.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Notice does not belong to this organization.');
      }

      // Normalize and sanitize inputs
      const data = {
        ...updateData,
        updatedBy: userId,
      };

      if (data.title) data.title = data.title.trim();
      if (data.description) data.description = data.description.trim();
      if (data.scheduleDate) data.scheduleDate = new Date(data.scheduleDate);

      // If scheduled, check if scheduleDate is past. If yes, auto-publish
      const targetStatus = data.status || notice.status;
      const targetScheduleDate = data.scheduleDate !== undefined ? data.scheduleDate : notice.scheduleDate;
      if (targetStatus === 'Scheduled' && targetScheduleDate && targetScheduleDate <= new Date()) {
        data.status = 'Published';
      }

      // Check if updating expiryDate alters status
      const targetExpiry = data.expiryDate ? new Date(data.expiryDate) : notice.expiryDate;
      const finalStatus = data.status || notice.status;
      if (finalStatus === 'Published' && targetExpiry <= new Date()) {
        data.status = 'Expired';
      }

      // Handle single-pinned notice business rule
      const willBePinned = data.isPinned !== undefined ? data.isPinned : notice.isPinned;
      const willBePublished = data.status ? data.status === 'Published' : notice.status === 'Published';
      if (willBePinned && willBePublished) {
        await noticeRepository.unpinAllExcept(orgId, notice._id, session);
      }

      const updatedNotice = await noticeRepository.updateNotice(id, data, session);
      await session.commitTransaction();

      // Emit event
      noticeEvents.emit('NOTICE_UPDATED', updatedNotice);

      return updatedNotice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Deletes a notice by ID.
   */
  async deleteNotice(id, orgId, userId = null) {
    const notice = await this.getNoticeById(id);

    // Verify that this notice belongs to the active organization
    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice does not belong to this organization.');
    }

    const deleted = await noticeRepository.deleteNotice(id);

    // Emit event
    noticeEvents.emit('NOTICE_DELETED', { id, orgId, userId });

    return deleted;
  }

  /**
   * Toggle the pinned status of a notice.
   */
  async togglePinNotice(id, isPinned, userId, orgId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const notice = await this.getNoticeById(id, session);

      // Verify organization
      if (notice.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Notice does not belong to this organization.');
      }

      if (notice.status !== 'Published' && isPinned) {
        throw new HttpError(400, 'Only published notices can be pinned.');
      }

      // If pinning, unpin all other notices in the organization first
      if (isPinned) {
        await noticeRepository.unpinAllExcept(orgId, notice._id, session);
      }

      const updatedNotice = await noticeRepository.updateNotice(
        id,
        { isPinned, updatedBy: userId },
        session
      );

      await session.commitTransaction();

      // Emit event
      noticeEvents.emit('NOTICE_PINNED_TOGGLED', updatedNotice);

      return updatedNotice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Mark a notice as read by a user.
   */
  async markNoticeAsRead(id, userId, orgId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const notice = await this.getNoticeById(id, session);

      // Verify organization
      if (notice.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Notice does not belong to this organization.');
      }

      // Add to readBy array if not already present
      const isAlreadyRead = notice.readBy.some(uid => uid.toString() === userId.toString());
      if (!isAlreadyRead) {
        notice.readBy.push(userId);
        await notice.save({ session });
      }

      await session.commitTransaction();

      // Emit event
      noticeEvents.emit('NOTICE_READ', { id, userId });

      return {
        ...notice.toObject(),
        isReadByUser: true,
        isBookmarkedByUser: notice.bookmarkedBy.some(uid => uid.toString() === userId.toString()),
        readerCount: notice.readBy.length,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Bookmark or unbookmark a notice.
   */
  async bookmarkNotice(id, userId, orgId, isBookmarked) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const notice = await this.getNoticeById(id, session);

      // Verify organization
      if (notice.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Notice does not belong to this organization.');
      }

      const userIndex = notice.bookmarkedBy.findIndex(uid => uid.toString() === userId.toString());

      if (isBookmarked) {
        if (userIndex === -1) {
          notice.bookmarkedBy.push(userId);
          await notice.save({ session });
        }
      } else {
        if (userIndex !== -1) {
          notice.bookmarkedBy.splice(userIndex, 1);
          await notice.save({ session });
        }
      }

      await session.commitTransaction();

      // Emit event
      noticeEvents.emit('NOTICE_BOOKMARKED', { id, userId, isBookmarked });

      return {
        ...notice.toObject(),
        isReadByUser: notice.readBy.some(uid => uid.toString() === userId.toString()),
        isBookmarkedByUser: isBookmarked,
        readerCount: notice.readBy.length,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Fetch notice statistics and trends.
   */
  async getNoticeStats(orgId) {
    const currentDate = new Date();
    // Auto-publish scheduled notices whose dates have passed
    const Notice = mongoose.model('Notice');
    await Notice.updateMany(
      { orgId: new mongoose.Types.ObjectId(orgId), status: 'Scheduled', scheduleDate: { $lte: currentDate } },
      { status: 'Published' }
    );
    await noticeRepository.updateExpiredNotices(orgId, currentDate);

    const matchQuery = { orgId: new mongoose.Types.ObjectId(orgId) };

    const activeCount = await noticeRepository.countDocuments(orgId, { status: 'Published' });
    const draftCount = await noticeRepository.countDocuments(orgId, { status: 'Draft' });
    const expiredCount = await noticeRepository.countDocuments(orgId, { status: 'Expired' });
    const scheduledCount = await noticeRepository.countDocuments(orgId, { status: 'Scheduled' });
    const archivedCount = await noticeRepository.countDocuments(orgId, { status: 'Archived' });
    const urgentCount = await noticeRepository.countDocuments(orgId, { status: 'Published', priority: { $in: ['High', 'Critical'] } });
    const totalCount = await noticeRepository.countDocuments(orgId, {});
    const pinnedCount = await noticeRepository.countDocuments(orgId, { isPinned: true });

    // Category breakdown
    const categoryStats = await Notice.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId) } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categories = { General: 0, Maintenance: 0, Events: 0, Emergency: 0, Meetings: 0 };
    categoryStats.forEach(stat => {
      if (categories[stat._id] !== undefined) {
        categories[stat._id] = stat.count;
      }
    });

    // Recent Activity (newest 5 notices)
    const recentNotices = await Notice.find({ orgId: new mongoose.Types.ObjectId(orgId) })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'username name');

    const recentActivity = recentNotices.map(notice => ({
      id: notice._id,
      title: notice.title,
      category: notice.category,
      priority: notice.priority,
      status: notice.status,
      createdAt: notice.createdAt,
      creatorName: notice.createdBy?.username || notice.createdBy?.name || 'Someone'
    }));

    // Trends over last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrends = await Notice.aggregate([
      {
        $match: {
          orgId: new mongoose.Types.ObjectId(orgId),
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const trends = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthLabel = `${monthNames[d.getMonth()]} ${y}`;
      
      const matched = monthlyTrends.find(t => t._id.year === y && t._id.month === m);
      trends.push({
        label: monthLabel,
        count: matched ? matched.count : 0
      });
    }

    return {
      kpis: {
        totalNotices: totalCount,
        activeNotices: activeCount,
        draftNotices: draftCount,
        expiredNotices: expiredCount,
        scheduledNotices: scheduledCount,
        archivedNotices: archivedCount,
        urgentNotices: urgentCount,
        pinnedNotices: pinnedCount
      },
      categories,
      recentActivity,
      trends
    };
  }
}

export default new NoticeBoardService();
