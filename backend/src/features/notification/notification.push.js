import logger from '../../utils/logger.utils.js';
import deviceTokenService from '../deviceToken/deviceToken.services.js';
import { buildPushCopy } from './notification.pushCopy.js';

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
 * Resolves the appropriate Android notification channel based on domain, type, and URL.
 */
export const resolveAndroidChannel = (payload) => {
  const { channelId, type = '', title = '', actionUrl = '', data = {} } = payload;
  if (channelId || data.channelId) {
    return channelId || data.channelId;
  }

  const str = `${type} ${title} ${actionUrl} ${data.type || ''}`.toLowerCase();

  if (str.includes('visitor') || str.includes('gate approval') || str.includes('walk-in') || str.includes('walkin')) {
    return 'visitors';
  }
  if (str.includes('invit')) {
    return 'invitations';
  }
  if (str.includes('billing') || str.includes('invoice') || str.includes('payment') || str.includes('assessment') || str.includes('due')) {
    return 'billing';
  }
  if (str.includes('complaint') || str.includes('ticket') || str.includes('technician')) {
    return 'complaints';
  }
  if (str.includes('directory') || str.includes('conversation') || str.includes('message') || str.includes('chat')) {
    return 'messages';
  }
  return 'general';
};

/**
 * Resolves a normalized semantic notification type for mobile deep-linking.
 */
export const resolveNotificationType = (payload) => {
  const { type = '', title = '', actionUrl = '', data = {} } = payload;
  if (data.type && !['INFO', 'WARNING', 'SUCCESS', 'ERROR'].includes(data.type)) {
    return data.type;
  }

  const str = `${title} ${actionUrl} ${type}`.toLowerCase();

  if (str.includes('gate approval') || str.includes('walk-in') || str.includes('walkin')) {
    return 'VISITOR_REQUEST';
  }
  if (str.includes('visitor')) {
    return 'VISITOR';
  }
  if (str.includes('invoice') || str.includes('bill') || str.includes('payment') || str.includes('billing')) {
    return 'BILLING';
  }
  if (str.includes('complaint')) {
    return 'COMPLAINT';
  }
  if (str.includes('booking') || str.includes('amenit')) {
    return 'AMENITY';
  }
  if (str.includes('poll')) {
    return 'POLL';
  }
  if (str.includes('notice')) {
    return 'NOTICE';
  }
  if (str.includes('message') || str.includes('directory')) {
    return 'MESSAGE';
  }
  if (str.includes('invit')) {
    return 'INVITATION';
  }
  return type || 'INFO';
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
    const resolvedChannel = resolveAndroidChannel(notificationPayload);
    const resolvedType = resolveNotificationType(notificationPayload);
    const pushCopy = buildPushCopy({ title, body, seed: data.notificationId }, resolvedType);
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
        title: pushCopy.title,
        subtitle: pushCopy.subtitle,
        body: pushCopy.body,
        ...(pushCopy.ttl ? { ttl: pushCopy.ttl } : {}),
        data: {
          notificationId: data.notificationId || null,
          type: resolvedType,
          entityId: data.entityId || null,
          route: data.route || null,
          action: data.action || 'OPEN_DETAILS',
          actionUrl,
          orgId: data.orgId || null,
          createdAt: data.createdAt || new Date().toISOString(),
          // Original in-app text, so client-side title matching keeps working
          inboxTitle: title || null,
          inboxBody: body || null,
          ...data,
        },
        channelId: resolvedChannel,
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
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        };

        if (process.env.EXPO_ACCESS_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN.trim()}`;
        }

        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
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
        const ticketIdsToCheck = [];
        tickets.forEach((ticket, idx) => {
          const targetToken = chunk[idx]?.to;

          if (ticket.status === 'ok') {
            sentCount++;
            if (ticket.id) {
              ticketIdsToCheck.push({ id: ticket.id, token: targetToken });
            }
          } else if (ticket.status === 'error') {
            failedCount++;
            logger.warn(`[Push Notification] Ticket error for token ${targetToken?.slice(0, 15)}...: ${ticket.message} (${ticket.details?.error || 'Unknown'})`);

            if (ticket.details?.error === 'DeviceNotRegistered' && targetToken) {
              // Automatically deactivate stale token
              deviceTokenService.deactivateInvalidToken(targetToken);
            }
          }
        });

        // 5. Asynchronously verify delivery receipts with Expo after a delay (15-30s)
        if (ticketIdsToCheck.length > 0) {
          scheduleReceiptCheck(ticketIdsToCheck, headers);
        }
      } catch (chunkError) {
        logger.error('[Push Notification] Network failure sending chunk to Expo:', chunkError);
        failedCount += chunk.length;
      }
    }

    logger.info(`[Push Notification] Completed push ticket dispatch: ${sentCount} accepted, ${failedCount} rejected`);
    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    // Swallowing errors inside safe try/catch block so push drops never crash caller
    logger.error('[Push Notification] Unexpected error in dispatchPushNotification:', error);
    return { sent: 0, failed: 0 };
  }
};

const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/**
 * Checks delivery receipts for Expo push tickets to catch FCM/APNs gateway errors (DeviceNotRegistered, MessageTooBig, etc.)
 */
const scheduleReceiptCheck = (ticketItems, headers) => {
  // Wait 20 seconds before querying receipts from Expo
  setTimeout(async () => {
    try {
      const ids = ticketItems.map((item) => item.id);
      const tokenMap = new Map(ticketItems.map((item) => [item.id, item.token]));

      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`[Push Receipts] Failed to retrieve receipts (${response.status}):`, errorText);
        return;
      }

      const result = await response.json();
      const receipts = result?.data || {};

      for (const [ticketId, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error') {
          const targetToken = tokenMap.get(ticketId);
          logger.warn(`[Push Receipts] Delivery failed by APNs/FCM for token ${targetToken ? targetToken.slice(0, 15) : 'unknown'}... Error: ${receipt.message} (${receipt.details?.error || 'Unknown'})`);

          if (receipt.details?.error === 'DeviceNotRegistered' && targetToken) {
            await deviceTokenService.deactivateInvalidToken(targetToken);
          }
        }
      }
    } catch (err) {
      logger.warn('[Push Receipts] Error querying push receipts:', err);
    }
  }, 20000);
};

export default {
  isValidExpoPushToken,
  dispatchPushNotification,
  scheduleReceiptCheck,
};
