import logger from '../../utils/logger.utils.js';
import deviceTokenService from '../deviceToken/deviceToken.services.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

/**
 * Validates whether a given string is a valid Expo push token format.
 * Matches ExponentPushToken[xxx] or ExpoPushToken[xxx]
 * @param {string} token
 * @returns {boolean}
 */
export const isValidExpoPushToken = (token) => {
  return typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token.trim());
};

/**
 * Dispatches mobile push notifications to all active registered devices of the given recipient(s).
 *
 * @param {string|string[]} recipientUserIds - Single user ID or array of user IDs
 * @param {object} notificationPayload - { title, body, actionUrl, type, sound, data }
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export const dispatchPushNotification = async (recipientUserIds, notificationPayload) => {
  try {
    const userIds = Array.isArray(recipientUserIds) ? recipientUserIds : [recipientUserIds];
    if (userIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // 1. Fetch active device tokens from DeviceToken feature service
    const deviceRecords = await deviceTokenService.getActiveTokensByUserIds(userIds);
    if (!deviceRecords || deviceRecords.length === 0) {
      logger.info(`[Push Notification] No active device tokens found for recipients: [${userIds.join(', ')}]`);
      return { sent: 0, failed: 0 };
    }

    // 2. Prepare Expo push message objects
    const { title, body, actionUrl = null, type = 'INFO', sound = 'default', data = {} } = notificationPayload;
    const messages = [];
    const tokenRecordMap = new Map();

    for (const record of deviceRecords) {
      const token = record.pushToken?.trim();
      if (!isValidExpoPushToken(token)) {
        logger.warn(`[Push Notification] Skipping invalid Expo push token: ${token}`);
        continue;
      }

      tokenRecordMap.set(token, record);
      messages.push({
        to: token,
        sound,
        title: title || 'ManageMyGate Alert',
        body: body || '',
        data: {
          ...data,
          actionUrl,
          type,
        },
        channelId: type === 'WARNING' || type === 'ERROR' ? 'billing' : 'default',
        priority: 'high',
      });
    }

    if (messages.length === 0) {
      return { sent: 0, failed: 0 };
    }

    logger.info(`[Push Notification] Preparing to dispatch ${messages.length} push message(s) via Expo Push Service`);

    // 3. Send in chunks of 100 per Expo documentation
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[Push Notification] HTTP Error from Expo Push Service (${response.status}):`, errorText);
          failedCount += chunk.length;
          continue;
        }

        const result = await response.json();
        const tickets = result?.data || [];

        // 4. Process tickets and handle token deactivation if device is no longer registered
        tickets.forEach((ticket, idx) => {
          const targetToken = chunk[idx]?.to;

          if (ticket.status === 'ok') {
            sentCount++;
          } else if (ticket.status === 'error') {
            failedCount++;
            logger.warn(`[Push Notification] Delivery error for token ${targetToken?.slice(0, 15)}...: ${ticket.message}`);

            if (ticket.details?.error === 'DeviceNotRegistered' && targetToken) {
              // Automatically deactivate stale token
              deviceTokenService.deactivateInvalidToken(targetToken);
            }
          }
        });
      } catch (chunkError) {
        logger.error('[Push Notification] Network failure sending chunk to Expo:', chunkError);
        failedCount += chunk.length;
      }
    }

    logger.info(`[Push Notification] Completed push dispatch: ${sentCount} sent, ${failedCount} failed`);
    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    // Swallowing errors inside safe try/catch block so push drops never crash caller
    logger.error('[Push Notification] Unexpected error in dispatchPushNotification:', error);
    return { sent: 0, failed: 0 };
  }
};

export default {
  isValidExpoPushToken,
  dispatchPushNotification,
};
