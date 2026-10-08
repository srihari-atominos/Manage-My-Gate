import { configureStore } from '@reduxjs/toolkit';
import authReducer, { performLogout, updateTokenAndUser } from '../store/authSlice';
import authService from '../services/authService';
import storage from '../../../utils/storage';

const mockUnregister = jest.fn();
jest.mock('../../notification/services/deviceTokenService', () => ({
  __esModule: true,
  deviceTokenService: { unregisterToken: (...args: any[]) => mockUnregister(...args) },
  default: { unregisterToken: (...args: any[]) => mockUnregister(...args) },
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: { logoutApi: jest.fn() },
}));

describe('logout clean-up', () => {
  const callOrder: string[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    // SecureStore is mocked without persistence; back storage with a map for this test
    const memory = new Map<string, string>();
    jest.spyOn(storage, 'getItem').mockImplementation(async (k: string) => memory.get(k) ?? null);
    jest.spyOn(storage, 'setItem').mockImplementation(async (k: string, v: string) => { memory.set(k, v); });
    jest.spyOn(storage, 'removeItem').mockImplementation(async (k: string) => { memory.delete(k); });
    callOrder.length = 0;
    mockUnregister.mockImplementation(async () => { callOrder.push('unregister'); });
    (authService.logoutApi as jest.Mock).mockImplementation(async () => { callOrder.push('logout'); });
    await storage.setItem('registered_push_token_u1', 'ExponentPushToken[abc]');
    await storage.setItem('refreshToken', 'rt-1');
  });

  it('unregisters this device\'s push token, then revokes the session with the refresh token', async () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(updateTokenAndUser({ token: 't', refreshToken: 'rt-1', user: { id: 'u1', email: 'a@b.co' } as any }));

    await store.dispatch(performLogout());

    expect(mockUnregister).toHaveBeenCalledWith('ExponentPushToken[abc]', 'u1');
    expect(authService.logoutApi).toHaveBeenCalledWith('rt-1');
    expect(callOrder).toEqual(['unregister', 'logout']);
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(await storage.getItem('refreshToken')).toBeNull();
  });

  it('still signs out when unregistering fails', async () => {
    mockUnregister.mockRejectedValue(new Error('offline'));
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(updateTokenAndUser({ token: 't', refreshToken: 'rt-1', user: { id: 'u1', email: 'a@b.co' } as any }));
    await store.dispatch(performLogout());
    expect(authService.logoutApi).toHaveBeenCalled();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
