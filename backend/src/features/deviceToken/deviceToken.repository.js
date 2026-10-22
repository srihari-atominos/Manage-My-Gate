import mongoose from 'mongoose';
import DeviceToken from './deviceToken.model.js';

/**
 * Repository for DeviceToken feature database operations.
 */
export class DeviceTokenRepository {
  /**
   * Upsert a device token for a user.
   * If the token already exists (even under another user or inactive), reassign it and activate it.
   * @param {string} userId
   * @param {object} tokenData - { pushToken, platform, deviceId, deviceModel, appVersion, versionCode }
   * @param {mongoose.ClientSession} [session]
   */
  async upsertToken(userId, tokenData, session = null) {
    const {
      pushToken,
      platform = 'android',
      deviceId = null,
      deviceModel = null,
      appVersion = null,
      versionCode = null,
    } = tokenData;

    const updateFields = {
      userId,
      platform,
      deviceId,
      deviceModel,
      isActive: true,
      lastUsedAt: new Date(),
    };

    if (appVersion) updateFields.appVersion = appVersion;
    if (versionCode) updateFields.versionCode = versionCode;

    return await DeviceToken.findOneAndUpdate(
      { pushToken },
      { $set: updateFields },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        session,
      }
    );
  }

  /**
   * Find all active device tokens for a list of user IDs.
   * @param {string[]|mongoose.Types.ObjectId[]} userIds
   * @param {mongoose.ClientSession} [session]
   */
  async findActiveTokensByUserIds(userIds, session = null) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const objectIds = userIds
      .filter(Boolean)
      .map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

    return await DeviceToken.find({
      userId: { $in: objectIds },
      isActive: true,
    })
      .select('userId pushToken platform deviceId appVersion versionCode')
      .session(session || null)
      .lean();
  }

  /**
   * Find all active device tokens for a given platform.
   * @param {string} platform
   * @param {mongoose.ClientSession} [session]
   */
  async findActiveTokensByPlatform(platform = 'android', session = null) {
    return await DeviceToken.find({
      platform,
      isActive: true,
    })
      .select('userId pushToken platform deviceId appVersion versionCode')
      .session(session || null)
      .lean();
  }

  /**
   * Deactivate a specific push token.
   * @param {string} pushToken
   * @param {mongoose.ClientSession} [session]
   * @param {string} [userId=null]
   */
  async deactivateToken(pushToken, session = null, userId = null) {
    const query = { pushToken };
    if (userId) {
      query.userId = userId;
    }
    return await DeviceToken.findOneAndUpdate(
      query,
      { $set: { isActive: false } },
      { session, new: true }
    );
  }

  /**
   * Deactivate all device tokens for a given user.
   * @param {string} userId
   * @param {mongoose.ClientSession} [session]
   */
  async deactivateUserTokens(userId, session = null) {
    return await DeviceToken.updateMany(
      { userId },
      { $set: { isActive: false } },
      { session }
    );
  }
}

export default new DeviceTokenRepository();
