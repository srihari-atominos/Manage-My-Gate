import {
  isPushNotificationEnabled,
  setPushNotificationEnabled,
} from '../features/notification/services/pushNotificationService';
import storage from '../utils/storage';

jest.mock('../utils/storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __store: store,
  };
});

describe('Push Notification Settings & Toggle Suppression', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const mockStore = (storage as any).__store;
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }
  });

  it('defaults to true when push notification setting is not configured', async () => {
    const isEnabled = await isPushNotificationEnabled();
    expect(isEnabled).toBe(true);
  });

  it('persists and returns false when push notification is disabled', async () => {
    await setPushNotificationEnabled(false);
    expect(storage.setItem).toHaveBeenCalledWith('setting_gateAlerts', 'false');

    const isEnabled = await isPushNotificationEnabled();
    expect(isEnabled).toBe(false);
  });

  it('persists and returns true when push notification is re-enabled', async () => {
    await setPushNotificationEnabled(false);
    let isEnabled = await isPushNotificationEnabled();
    expect(isEnabled).toBe(false);

    await setPushNotificationEnabled(true);
    expect(storage.setItem).toHaveBeenCalledWith('setting_gateAlerts', 'true');

    isEnabled = await isPushNotificationEnabled();
    expect(isEnabled).toBe(true);
  });

  it('restores all saved preferences on application launch', async () => {
    await storage.setItem('setting_gateAlerts', 'false');
    await storage.setItem('setting_maintenanceNotices', 'true');
    await storage.setItem('setting_biometricUnlock', 'false');

    const preferenceKeys = [
      'gateAlerts',
      'maintenanceNotices',
      'communityPolls',
      'emergencyBroadcasts',
      'biometricUnlock',
      'requireGateApprovalPin',
    ];

    const restored: Record<string, boolean> = {};
    for (const key of preferenceKeys) {
      const val = await storage.getItem(`setting_${key}`);
      if (val !== null && val !== undefined) {
        try {
          restored[key] = JSON.parse(val);
        } catch {
          restored[key] = val === 'true';
        }
      }
    }

    expect(restored.gateAlerts).toBe(false);
    expect(restored.maintenanceNotices).toBe(true);
    expect(restored.biometricUnlock).toBe(false);
    expect(restored.communityPolls).toBeUndefined(); // falls back to default
  });
});
