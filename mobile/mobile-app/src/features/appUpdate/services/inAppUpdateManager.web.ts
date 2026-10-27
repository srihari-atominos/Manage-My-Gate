import { Linking } from 'react-native';
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

class InAppUpdateManagerWeb {
  async checkPlayStoreUpdate(): Promise<{ isAvailable: boolean; storeVersion?: string }> {
    return { isAvailable: false };
  }

  async startUpdate(
    _kind: InAppUpdateKind = 'FLEXIBLE',
    _onStatusChange?: (status: InAppUpdateStatus) => void
  ): Promise<boolean> {
    return await this.openPlayStoreListing();
  }

  async completeFlexibleUpdate(): Promise<void> {
    // No-op on web
  }

  async openPlayStoreListing(customUrl?: string): Promise<boolean> {
    const targetUrl = customUrl || DEFAULT_PLAY_STORE_URL;
    try {
      await Linking.openURL(targetUrl);
      return true;
    } catch (e) {
      console.warn('[InAppUpdateManagerWeb] Failed to open store URL:', e);
      return false;
    }
  }
}

export const inAppUpdateManager = new InAppUpdateManagerWeb();
export default inAppUpdateManager;
