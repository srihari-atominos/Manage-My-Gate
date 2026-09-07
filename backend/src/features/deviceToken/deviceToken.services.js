import mongoose from 'mongoose';
import deviceTokenRepository from './deviceToken.repository.js';
import logger from '../../utils/logger.utils.js';
import HttpError from '../../utils/httpError.utils.js';

export class DeviceTokenService {
  /**
   * Register or refresh a push notification device token for a user.
   * @param {string} userId - Authenticated user ID
   * @param {object} payload - { pushToken, platform, deviceId, deviceModel }
   */
  async registerToken(userId, payload) {
    if (!userId) {
      throw new HttpError(401, 'User ID is required to register device token');
    }

    const { pushToken, platform = 'android', deviceId = null, deviceModel = null } = payload || {};
    if (!pushToken || typeof pushToken !== 'string') {
      throw new HttpError(400, 'Valid pushToken string is required');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const record = await deviceTokenRepository.upsertToken(
        userId,
        { pushToken, platform, deviceId, deviceModel },
        session
      );
      await session.commitTransaction();

      logger.info(`Device push token registered for user ${userId} (Platform: ${platform})`);
      return record;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Failed to register device token:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Unregister / deactivate a push token on user logout.
   * @param {string} pushToken
   * @param {string} [userId]
   */
  async unregisterToken(pushToken, userId = null) {
    if (!pushToken) {
      throw new HttpError(400, 'Push token is required to unregister device');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updated = await deviceTokenRepository.deactivateToken(pushToken, session);
      await session.commitTransaction();

      logger.info(`Device push token deactivated: ${pushToken.slice(0, 15)}...`);
      return updated;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Failed to unregister device token:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Fetch active device tokens for a given list of user IDs.
   * Cross-feature service method used by push dispatcher.
   * @param {string[]|string} userIds
   * @returns {Promise<Array<{ userId: string, pushToken: string, platform: string }>>}
   */
  async getActiveTokensByUserIds(userIds) {
    const list = Array.isArray(userIds) ? userIds : [userIds];
    return await deviceTokenRepository.findActiveTokensByUserIds(list);
  }

  /**
   * Deactivate an invalid token reported by push provider (e.g. DeviceNotRegistered).
   * @param {string} pushToken
   */
  async deactivateInvalidToken(pushToken) {
    try {
      await deviceTokenRepository.deactivateToken(pushToken);
      logger.info(`Invalid token marked inactive: ${pushToken.slice(0, 15)}...`);
    } catch (error) {
      logger.warn('Failed to deactivate invalid token:', error);
    }
  }
}

export default new DeviceTokenService();
