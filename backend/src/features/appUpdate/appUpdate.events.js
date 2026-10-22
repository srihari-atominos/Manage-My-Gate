import EventEmitter from 'events';
import logger from '../../utils/logger.utils.js';
import deviceTokenService from '../deviceToken/deviceToken.services.js';
import { dispatchPushNotification } from '../notification/notification.push.js';

class AppUpdateEventEmitter extends EventEmitter {}

export const appUpdateEvents = new AppUpdateEventEmitter();

export const APP_UPDATE_EVENT_NAMES = Object.freeze({
  RELEASE_PUBLISHED: 'appUpdate:published',
  RELEASE_ANNOUNCED: 'appUpdate:announced',
});

/**
 * Handle background push notification delivery for announced release.
 * Swallows transmission errors to avoid crashing main thread.
 */
appUpdateEvents.on(APP_UPDATE_EVENT_NAMES.RELEASE_ANNOUNCED, async (payload) => {
  try {
    const { release, correlationId } = payload;
    if (!release) return;

    logger.info(`[AppUpdate Events] Initiating push notification dispatch for release v${release.version} (build ${release.versionCode})`, { correlationId });

    // Find active Android device tokens registered on the platform
    const tokens = await deviceTokenService.getAllActiveTokensByPlatform(release.platform || 'android');
    if (!tokens || tokens.length === 0) {
      logger.info('[AppUpdate Events] No active device tokens found for announcement', { correlationId });
      return;
    }

    // Extract unique user IDs
    const recipientUserIds = [...new Set(tokens.map((t) => t.userId?.toString()).filter(Boolean))];

    if (recipientUserIds.length === 0) {
      logger.info('[AppUpdate Events] No eligible recipient user IDs found for announcement', { correlationId });
      return;
    }

    const pushPayload = {
      title: 'NAHOM Update Available',
      body: release.releaseType === 'CRITICAL'
        ? `A critical update (v${release.version}) is available. Please update now to continue.`
        : `A new version of NAHOM (v${release.version}) is available. Tap to view details and update.`,
      channelId: 'general',
      type: 'APP_UPDATE',
      data: {
        type: 'APP_UPDATE',
        releaseId: release._id?.toString(),
        version: release.version,
        versionCode: release.versionCode,
        releaseType: release.releaseType,
        actionUrl: '/(resident)/notifications',
      },
    };

    const result = await dispatchPushNotification(recipientUserIds, pushPayload);
    logger.info(`[AppUpdate Events] Release announcement push dispatched. Sent: ${result.sent}, Failed: ${result.failed}`, { correlationId });
  } catch (error) {
    logger.error(`[AppUpdate Events] Failed to dispatch announcement push notifications: ${error.message}`, { error, stack: error.stack });
  }
});

export default appUpdateEvents;
