import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { DEFAULT_PLAY_STORE_URL } from './appUpdateService';

export type InAppUpdateKind = 'FLEXIBLE' | 'IMMEDIATE';

export interface InAppUpdateStatus {
  status:
    | 'IDLE'
    | 'DOWNLOADING'
    | 'DOWNLOADED'
    | 'INSTALLING'
    | 'INSTALLED'
    | 'FAILED'
    | 'CANCELED';
  bytesDownloaded?: number;
  totalBytesToDownload?: number;
  progressPercent?: number;
  error?: string;
}

const isExpoGo =
  (Constants as any)?.executionEnvironment === 'storeClient' ||
  (Constants as any)?.appOwnership === 'expo';

class InAppUpdateManager {
  private inAppUpdatesInstance: any = null;
  private isAvailableOnPlatform = false;
  private statusListener: ((status: InAppUpdateStatus) => void) | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (Platform.OS !== 'android' || isExpoGo) {
      this.isAvailableOnPlatform = false;
      return;
    }

    try {
      // Lazy load to prevent crashes in unsupported environments or web
      const SpInAppUpdates = require('sp-react-native-in-app-updates').default;
      if (SpInAppUpdates) {
        this.inAppUpdatesInstance = new SpInAppUpdates(false);
        this.isAvailableOnPlatform = true;
      }
    } catch (e) {
      console.log('[InAppUpdateManager] Native module not available; using Play Store fallback.');
      this.isAvailableOnPlatform = false;
    }
  }

  /**
   * Check if Google Play Store has an available in-app update for this build
   */
  async checkPlayStoreUpdate(): Promise<{ isAvailable: boolean; storeVersion?: string }> {
    if (!this.isAvailableOnPlatform || !this.inAppUpdatesInstance) {
      return { isAvailable: false };
    }

    try {
      const curVersion = Constants.expoConfig?.version || '1.0.8';
      const result = await this.inAppUpdatesInstance.checkNeedsUpdate({ curVersion });
      return {
        isAvailable: Boolean(result?.shouldUpdate),
        storeVersion: result?.storeVersion,
      };
    } catch (err: any) {
      console.log('[InAppUpdateManager] checkPlayStoreUpdate failed or skipped:', err?.message || err);
      return { isAvailable: false };
    }
  }

  /**
   * Start Google Play update flow (Flexible or Immediate)
   */
  async startUpdate(
    kind: InAppUpdateKind = 'FLEXIBLE',
    onStatusChange?: (status: InAppUpdateStatus) => void
  ): Promise<boolean> {
    this.statusListener = onStatusChange || null;

    if (!this.isAvailableOnPlatform || !this.inAppUpdatesInstance) {
      return await this.openPlayStoreListing();
    }

    try {
      const { IAUUpdateKind, IAUInstallStatus } = require('sp-react-native-in-app-updates');
      const updateType =
        kind === 'IMMEDIATE' ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

      if (kind === 'FLEXIBLE') {
        this.inAppUpdatesInstance.addStatusUpdateListener((event: any) => {
          const { status, bytesDownloaded, totalBytesToDownload } = event || {};
          let progressPercent = 0;
          if (totalBytesToDownload && totalBytesToDownload > 0) {
            progressPercent = Math.min(100, Math.round((bytesDownloaded / totalBytesToDownload) * 100));
          }

          if (status === IAUInstallStatus.DOWNLOADING) {
            this.statusListener?.({
              status: 'DOWNLOADING',
              bytesDownloaded,
              totalBytesToDownload,
              progressPercent,
            });
          } else if (status === IAUInstallStatus.DOWNLOADED) {
            this.statusListener?.({
              status: 'DOWNLOADED',
              bytesDownloaded,
              totalBytesToDownload,
              progressPercent: 100,
            });
          } else if (status === IAUInstallStatus.FAILED) {
            this.statusListener?.({
              status: 'FAILED',
              error: 'Download failed from Google Play.',
            });
          } else if (status === IAUInstallStatus.CANCELED) {
            this.statusListener?.({
              status: 'CANCELED',
            });
          }
        });
      }

      await this.inAppUpdatesInstance.startUpdate({ updateType });
      return true;
    } catch (err: any) {
      console.warn('[InAppUpdateManager] Native startUpdate failed, falling back to Play Store URL:', err);
      this.statusListener?.({
        status: 'FAILED',
        error: err?.message || 'Update could not start',
      });
      return await this.openPlayStoreListing();
    }
  }

  /**
   * Complete flexible update installation (restarts app)
   */
  async completeFlexibleUpdate(): Promise<void> {
    if (!this.isAvailableOnPlatform || !this.inAppUpdatesInstance) {
      return;
    }

    try {
      this.statusListener?.({ status: 'INSTALLING' });
      await this.inAppUpdatesInstance.installUpdate();
    } catch (err: any) {
      console.warn('[InAppUpdateManager] completeFlexibleUpdate failed:', err);
      await this.openPlayStoreListing();
    }
  }

  /**
   * Fallback: direct user to official Google Play Store listing
   */
  async openPlayStoreListing(customUrl?: string): Promise<boolean> {
    const targetUrl = customUrl || DEFAULT_PLAY_STORE_URL;
    const marketUrl = 'market://details?id=com.atominosconsulting.nahom';

    try {
      if (Platform.OS === 'android') {
        const canOpenMarket = await Linking.canOpenURL(marketUrl);
        if (canOpenMarket) {
          await Linking.openURL(marketUrl);
          return true;
        }
      }
      await Linking.openURL(targetUrl);
      return true;
    } catch (e) {
      console.warn('[InAppUpdateManager] Failed to open Play Store URL:', e);
      return false;
    }
  }
}

export const inAppUpdateManager = new InAppUpdateManager();
export default inAppUpdateManager;
