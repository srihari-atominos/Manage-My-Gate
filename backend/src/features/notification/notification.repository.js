import mongoose from 'mongoose';
import Notification from './notification.model.js';

/**
 * Repository for Notification feature db operations.
 */
export class NotificationRepository {
  /**
   * Create a new notification.
   * @param {object} notificationData - Data payload for creating notification
   * @param {mongoose.ClientSession} [session] - Optional Mongoose session for transaction
   * @returns {Promise<object>} The created notification document
   */
  async create(notificationData, session) {
    const notification = new Notification(notificationData);
    return await notification.save({ session });
  }

  /**
   * Find a notification by ID.
   * @param {string} id - Notification ID
   * @param {mongoose.ClientSession} [session] - Optional Mongoose session
   * @returns {Promise<object|null>} The notification document or null
   */
  async findById(id, session) {
    return await Notification.findById(id).session(session || null);
  }

  /**
   * Update a notification.
   * @param {string} id - Notification ID
   * @param {object} updateData - Data to update
   * @param {mongoose.ClientSession} [session] - Optional Mongoose session
   * @returns {Promise<object|null>} The updated notification document
   */
  async update(id, updateData, session) {
    return await Notification.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      session,
    });
  }

  /**
   * Fetch paginated user notifications along with unread counts using a single aggregate pipeline with $facet.
   * @param {string} userId - User's ID
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum number of records to return
   * @param {mongoose.ClientSession} [session] - Optional Mongoose session
   * @returns {Promise<object>} Object containing notifications array, totalCount, and unreadCount
   */
  async findNotificationsWithMetadata(userId, skip, limit, session) {
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const pipeline = [
      { $match: { recipientId: userIdObj } },
      {
        $facet: {
          metadata: [
            { $group: { _id: null, totalCount: { $sum: 1 } } }
          ],
          unreadCount: [
            { $match: { isRead: false } },
            { $count: 'count' }
          ],
          notifications: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ];

    const results = await Notification.aggregate(pipeline).session(session || null);

    const facetResult = results[0] || {};
    const notifications = facetResult.notifications || [];
    const totalCount = (facetResult.metadata && facetResult.metadata[0]) ? facetResult.metadata[0].totalCount : 0;
    const unreadCount = (facetResult.unreadCount && facetResult.unreadCount[0]) ? facetResult.unreadCount[0].count : 0;

    return {
      notifications,
      totalCount,
      unreadCount,
    };
  }

  /**
   * Mark all unread notifications for a specific user as read.
   * @param {string} userId - The user's ID
   * @param {Date} readAt - Date when marked as read
   * @param {mongoose.ClientSession} [session] - Optional Mongoose session
   * @returns {Promise<object>} The update operation result (e.g. modifiedCount)
   */
  async markAllAsRead(userId, readAt, session) {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    return await Notification.updateMany(
      { recipientId: userIdObj, isRead: false },
      { $set: { isRead: true, readAt } },
      { session }
    );
  }

  /**
   * Delete a notification by ID.
   * @param {string} id - The notification's ID
   * @param {mongoose.ClientSession} [session] - Optional Mongoose session for transaction
   * @returns {Promise<object|null>} The deleted notification document or null
   */
  async delete(id, session) {
    return await Notification.findByIdAndDelete(id, { session });
  }
}

export default new NotificationRepository();
