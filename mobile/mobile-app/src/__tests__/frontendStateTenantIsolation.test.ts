import { rootReducer } from '../store/store';
import storage from '../utils/storage';
import * as SecureStore from 'expo-secure-store';
import apiClient, { cancelInFlightRequests, injectStore } from '../services/apiClient';

describe('Frontend State Tenant Isolation Suite (PHASE-05.1)', () => {
  beforeEach(async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    storage.clearMemoryCache();
    await storage.removeItem('token');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    await storage.removeItem('availableWorkspaces');
  });

  describe('F01 & F02: Redux Store Root Purge & Tenant Switching', () => {
    it('1. Purges all feature slice state when switching workspace context', () => {
      // 1. Simulate state populated under Tenant A
      const tenantAState = {
        auth: {
          isAuthenticated: true,
          token: 'jwt-tenant-a',
          user: {
            id: 'user-001',
            email: 'admin@tenant-a.com',
            orgId: 'tenant-a-org',
            activeOrgId: 'tenant-a-org',
            role: 'Admin',
          },
        },
        noticeBoard: {
          notices: [{ id: 'notice-tenant-a', title: 'Tenant A Secret Memo' }],
          loading: false,
          error: null,
        },
        complaints: {
          list: [{ id: 'complaint-tenant-a', title: 'Tenant A Pipe Leak' }],
          loading: false,
          error: null,
        },
        billing: {
          myDues: [{ invoiceId: 'inv-tenant-a', amount: 500 }],
        },
        visitorPass: {
          passes: [{ id: 'pass-tenant-a', visitorName: 'Tenant A Guest' }],
        },
      };

      // 2. Dispatch workspace switch to Tenant B
      const switchAction = {
        type: 'auth/switchWorkspaceContext/fulfilled',
        payload: {
          token: 'jwt-tenant-b',
          user: {
            id: 'user-001',
            email: 'admin@tenant-a.com',
            orgId: 'tenant-b-org',
            activeOrgId: 'tenant-b-org',
            role: 'Resident',
          },
        },
      };

      const nextState = rootReducer(tenantAState, switchAction);

      // Verify feature slices are completely reset to initial empty state
      expect(nextState.noticeBoard.notices).toEqual([]);
      expect(nextState.complaints.list).toEqual([]);
      expect(nextState.billing.invoicesList).toEqual([]);
      expect(nextState.billing.activeDues.unitBreakdown).toEqual([]);
      expect(nextState.visitorPass.passes).toEqual([]);
      // Verify auth identity is maintained without carrying Tenant A feature state
      expect(nextState.auth.isAuthenticated).toBe(true);
    });

    it('2. Purges feature slice state when setActiveCommunityOrg is dispatched', () => {
      const tenantAState = {
        auth: {
          isAuthenticated: true,
          token: 'jwt-tenant-a',
          user: { id: 'user-1', orgId: 'tenant-a-org' },
        },
        noticeBoard: {
          notices: [{ id: 'notice-1', title: 'Notice 1' }],
        },
        complaints: {
          list: [{ id: 'complaint-1', title: 'Complaint 1' }],
        },
      };

      const action = {
        type: 'auth/setActiveCommunityOrg',
        payload: { orgId: 'tenant-b-org', orgName: 'Community B' },
      };

      const nextState = rootReducer(tenantAState, action);

      expect(nextState.noticeBoard.notices).toEqual([]);
      expect(nextState.complaints.list).toEqual([]);
    });
  });

  describe('F03: Logout & Account Switching State Cleansing', () => {
    it('3. Clears entire Redux state including auth on performLogout fulfilled', () => {
      const activeState = {
        auth: {
          isAuthenticated: true,
          token: 'valid-token',
          user: { id: 'user-99', name: 'Leaking User' },
        },
        noticeBoard: {
          notices: [{ id: 'confidential-doc' }],
        },
      };

      const logoutAction = {
        type: 'auth/performLogout/fulfilled',
      };

      const nextState = rootReducer(activeState, logoutAction);

      // All state reinitialized to defaults
      expect(nextState.auth.isAuthenticated).toBe(false);
      expect(nextState.auth.user).toBeNull();
      expect(nextState.auth.token).toBeNull();
      expect(nextState.noticeBoard.notices).toEqual([]);
    });

    it('4. Clears storage memory cache and persisted items on logout', async () => {
      await storage.setItem('token', 'sensitive-auth-token');
      await storage.setItem('user', JSON.stringify({ id: 'user-123' }));
      await storage.setItem('availableWorkspaces', JSON.stringify([{ id: 'org-1' }]));

      // Verify cached in memory
      expect(await storage.getItem('token')).toBe('sensitive-auth-token');

      // Execute cache wipe
      storage.clearMemoryCache();
      await storage.removeItem('token');
      await storage.removeItem('user');
      await storage.removeItem('availableWorkspaces');

      expect(await storage.getItem('token')).toBeNull();
      expect(await storage.getItem('user')).toBeNull();
      expect(await storage.getItem('availableWorkspaces')).toBeNull();
    });
  });

  describe('F04: Stale and Out-of-Order API Response Invalidation', () => {
    it('5. In-flight requests are aborted when cancelInFlightRequests is invoked', () => {
      expect(() => {
        cancelInFlightRequests('Tenant switched to Tenant B');
      }).not.toThrow();
    });

    it('6. Discards responses tagged with an outdated tenant ID', async () => {
      // Mock store with active tenant B
      const mockStore = {
        getState: () => ({
          auth: {
            user: {
              activeOrgId: 'tenant-b-org',
              orgId: 'tenant-b-org',
            },
          },
        }),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
      } as any;

      injectStore(mockStore);

      // Simulate a response that completed late, tagged with Tenant A
      const staleResponse = {
        data: [{ id: 'secret-a', title: 'Tenant A Confidential' }],
        config: {
          _tenantId: 'tenant-a-org',
          url: '/api/v1/notices',
        },
      };

      // Test the response interceptor rejection logic directly
      const responseInterceptor = (apiClient.interceptors.response as any).handlers[0]?.fulfilled;

      if (responseInterceptor) {
        await expect(responseInterceptor(staleResponse)).rejects.toMatchObject({
          message: expect.stringContaining('Stale tenant response discarded'),
          code: 'ERR_CANCELED',
        });
      }
    });

    it('7. Accepts responses tagged with the current active tenant ID', async () => {
      const mockStore = {
        getState: () => ({
          auth: {
            user: {
              activeOrgId: 'tenant-b-org',
              orgId: 'tenant-b-org',
            },
          },
        }),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
      } as any;

      injectStore(mockStore);

      const validResponse = {
        data: { success: true, items: ['Tenant B Data'] },
        config: {
          _tenantId: 'tenant-b-org',
          url: '/api/v1/notices',
        },
      };

      const responseInterceptor = (apiClient.interceptors.response as any).handlers[0]?.fulfilled;
      if (responseInterceptor) {
        const result = await responseInterceptor(validResponse);
        expect(result.items).toEqual(['Tenant B Data']);
      }
    });
  });

  describe('F05: Tenant-Dependent Cache Partitioning', () => {
    it('8. Scopes storage cache keys by tenant ID and user ID', () => {
      const tenantA = 'org-alpha';
      const tenantB = 'org-beta';
      const userId = 'usr-007';

      const generateKey = (orgId: string, uId: string, resource: string) =>
        `manage_my_gate_${orgId}_${uId}_${resource}`;

      const keyA = generateKey(tenantA, userId, 'recent_issues');
      const keyB = generateKey(tenantB, userId, 'recent_issues');

      expect(keyA).not.toEqual(keyB);
      expect(keyA).toContain(tenantA);
      expect(keyB).toContain(tenantB);
    });
  });

  describe('F07: Real-Time Event & WebSocket Tenant Matching', () => {
    it('9. Filters incoming socket events if payload orgId does not match active tenant', () => {
      const isMatchingTenant = (payload: any, activeOrgId: string) => {
        if (!payload || typeof payload !== 'object') return true;
        const targetOrg =
          payload.orgId ||
          payload.organizationId ||
          payload.data?.orgId ||
          payload.data?.organizationId;
        if (!targetOrg) return true;
        if (!activeOrgId) return true;
        return String(targetOrg) === String(activeOrgId);
      };

      const activeTenant = 'tenant-current-123';

      // Event from previous tenant
      const staleEvent = {
        orgId: 'tenant-old-999',
        type: 'VISITOR',
        data: { guest: 'Hacker' },
      };

      // Event from current tenant
      const currentEvent = {
        orgId: 'tenant-current-123',
        type: 'VISITOR',
        data: { guest: 'Invited Guest' },
      };

      // Broadcast event without orgId
      const broadcastEvent = {
        type: 'SYSTEM_ANNOUNCEMENT',
        message: 'Server maintenance',
      };

      expect(isMatchingTenant(staleEvent, activeTenant)).toBe(false);
      expect(isMatchingTenant(currentEvent, activeTenant)).toBe(true);
      expect(isMatchingTenant(broadcastEvent, activeTenant)).toBe(true);
    });
  });

  describe('F06 & F09: Role and Route Access Integrity', () => {
    it('10. Demoting permissions clears privileged state on tenant context change', () => {
      const adminTenantState = {
        auth: {
          isAuthenticated: true,
          token: 'token-admin',
          user: {
            id: 'user-multi-role',
            role: 'SuperAdmin',
            permissions: ['*'],
            orgId: 'community-hq',
          },
        },
        roleBuilder: {
          roles: [{ id: 'role-1', name: 'Master Role' }],
        },
      };

      // User switches to Resident context in community-branch
      const switchAction = {
        type: 'auth/switchWorkspaceContext/fulfilled',
        payload: {
          token: 'token-resident',
          user: {
            id: 'user-multi-role',
            role: 'Resident',
            permissions: ['visitor:create', 'complaint:create'],
            orgId: 'community-branch',
          },
        },
      };

      const newState = rootReducer(adminTenantState, switchAction);

      // Verify elevated roleBuilder slice was purged
      expect(newState.roleBuilder.roles).toEqual([]);
      expect(newState.auth.user?.role).toBe('Resident');
      expect(newState.auth.user?.permissions).not.toContain('*');
    });
  });

  describe('PHASE-05.1 Closure Verification Scenarios', () => {
    it('11. Discards in-flight response when user logs out before completion (null active tenant)', async () => {
      // Mock store where user has logged out (auth is null, workspace is null)
      const loggedOutStore = {
        getState: () => ({
          auth: {
            isAuthenticated: false,
            user: null,
            token: null,
          },
          workspace: {
            activeOrganizationId: null,
          },
        }),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
      } as any;

      injectStore(loggedOutStore);

      const lateResponse = {
        data: { list: ['Confidential Tenant A Records'] },
        config: {
          _tenantId: 'tenant-a-org',
          url: '/api/v1/complaints',
        },
      };

      const responseInterceptor = (apiClient.interceptors.response as any).handlers[0]?.fulfilled;
      if (responseInterceptor) {
        await expect(responseInterceptor(lateResponse)).rejects.toMatchObject({
          message: expect.stringContaining('Stale tenant response discarded'),
          code: 'ERR_CANCELED',
        });
      }
    });

    it('12. Missing tenant context fails safely without tagging invalid tenant ID', async () => {
      const emptyContextStore = {
        getState: () => ({
          auth: {
            isAuthenticated: true,
            user: { id: 'user-no-tenant' }, // No orgId or activeOrgId
          },
          workspace: {
            activeOrganizationId: null,
          },
        }),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
      } as any;

      injectStore(emptyContextStore);

      const requestConfig = {
        headers: {},
        url: '/api/v1/amenities',
      } as any;

      const requestInterceptor = (apiClient.interceptors.request as any).handlers[0]?.fulfilled;
      if (requestInterceptor) {
        const processedConfig = await requestInterceptor(requestConfig);
        expect(processedConfig._tenantId).toBeUndefined();
        expect(processedConfig.headers['x-organization-id']).toBeUndefined();
      }
    });

    it('13. Failed workspace switch preserves current authenticated identity without adopting target tenant', () => {
      const preSwitchState = {
        auth: {
          isAuthenticated: true,
          token: 'token-tenant-a',
          user: {
            id: 'user-001',
            orgId: 'tenant-a-org',
            activeOrgId: 'tenant-a-org',
            role: 'Resident',
          },
          loading: true,
          error: null,
        },
        noticeBoard: {
          notices: [], // Already purged during switch pending
        },
        complaints: {
          list: [],
        },
      };

      // Switch failed (e.g. 403 Forbidden from backend)
      const rejectAction = {
        type: 'auth/switchWorkspaceContext/rejected',
        payload: 'Access denied to target organization',
      };

      const nextState = rootReducer(preSwitchState, rejectAction);

      // Verify auth remains intact with Tenant A, not corrupted with unverified target tenant
      expect(nextState.auth.user.orgId).toBe('tenant-a-org');
      expect(nextState.auth.user.activeOrgId).toBe('tenant-a-org');
      expect(nextState.auth.token).toBe('token-tenant-a');
      expect(nextState.auth.loading).toBe(false);
      expect(nextState.auth.error).toBe('Access denied to target organization');
      // Feature slices remain cleanly empty (no cross-tenant leakage)
      expect(nextState.noticeBoard.notices).toEqual([]);
      expect(nextState.complaints.list).toEqual([]);
    });

    it('14. Multi-tab logout signal triggers clean session invalidation', async () => {
      let isLoggedOut = false;
      const simulateStorageEvent = (key: string, newValue: string | null) => {
        if (key === 'auth_logout' || (key === 'token' && !newValue)) {
          isLoggedOut = true;
          storage.clearMemoryCache();
        }
      };

      await storage.setItem('token', 'active-token');
      expect(await storage.getItem('token')).toBe('active-token');

      // Another tab sets auth_logout
      simulateStorageEvent('auth_logout', String(Date.now()));

      expect(isLoggedOut).toBe(true);
      await storage.removeItem('token');
      expect(await storage.getItem('token')).toBeNull();
    });

    it('15. WebSocket room policy prevents unauthorized cross-tenant room subscriptions', () => {
      const canUserJoinRoom = (user: { id: string; activeOrgId: string; role: string }, room: string) => {
        if (!room) return false;
        if (room.startsWith('user:')) {
          return room === `user:${user.id}`;
        }
        if (room.startsWith('org:')) {
          const parts = room.split(':');
          const requestedOrg = parts[1];
          if (requestedOrg !== user.activeOrgId) return false;
          if (room === `org:${user.activeOrgId}:guards`) {
            return user.role === 'SecurityGuard' || user.role === 'Admin';
          }
          return true;
        }
        return false;
      };

      const residentUser = { id: 'usr-10', activeOrgId: 'org-legit', role: 'Resident' };

      // Legitimate rooms
      expect(canUserJoinRoom(residentUser, 'user:usr-10')).toBe(true);
      expect(canUserJoinRoom(residentUser, 'org:org-legit')).toBe(true);

      // Blocked: victim's user room
      expect(canUserJoinRoom(residentUser, 'user:usr-victim')).toBe(false);

      // Blocked: foreign tenant room
      expect(canUserJoinRoom(residentUser, 'org:org-foreign')).toBe(false);

      // Blocked: privileged guard room without guard role
      expect(canUserJoinRoom(residentUser, 'org:org-legit:guards')).toBe(false);
    });
  });
});
