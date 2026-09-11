import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { mapPermission, expandUserPermissions } from '../../../src/utils/permissionMapper.js';
import { getPermissionsForUser, authorizePermission } from '../../../src/middlewares/rbac.middleware.js';
import noticeEvents from '../../../src/features/noticeBoard/noticeBoard.events.js';
import '../../../src/features/noticeBoard/noticeBoard.audit.js';
import auditLogService from '../../../src/features/auditLog/auditLog.services.js';

describe('Phase 7: Granular RBAC Permissions & Audit Trails Tests', () => {
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  describe('1. Permission Mapping & Aliasing (mapPermission)', () => {
    it('should map legacy dot-syntax and alias keys to canonical internal permissions', () => {
      assert.equal(mapPermission('amenities.read'), 'amenities:read');
      assert.equal(mapPermission('notices.read'), 'notices:active_board');
      assert.equal(mapPermission('notices:create'), 'notices:manage_notices');
      assert.equal(mapPermission('polls.read'), 'polls:read');
      assert.equal(mapPermission('polls.vote'), 'polls:vote');
      assert.equal(mapPermission('notices:vote_polls'), 'polls:vote');
      assert.equal(mapPermission('notices:manage_polls'), 'notices:manage_notices');
      assert.equal(mapPermission('custom:permission'), 'custom:permission');
    });
  });

  describe('2. Coarse-to-Granular Permission Expansion (expandUserPermissions)', () => {
    it('should expand notices:manage_notices to all granular notice and poll permissions', () => {
      const expanded = expandUserPermissions(['notices:manage_notices']);

      assert.ok(expanded.includes('notices:create'));
      assert.ok(expanded.includes('notices:update'));
      assert.ok(expanded.includes('notices:delete'));
      assert.ok(expanded.includes('notices:publish'));
      assert.ok(expanded.includes('notices:pin'));
      assert.ok(expanded.includes('notices:read'));
      assert.ok(expanded.includes('polls:create'));
      assert.ok(expanded.includes('polls:close'));
      assert.ok(expanded.includes('polls:view_voters'));
      assert.ok(expanded.includes('polls:export'));
      assert.ok(expanded.includes('polls:vote'));
    });

    it('should expand notices:polls to polls:read and polls:vote', () => {
      const expanded = expandUserPermissions(['notices:polls']);

      assert.ok(expanded.includes('polls:read'));
      assert.ok(expanded.includes('polls:vote'));
      assert.ok(!expanded.includes('polls:create'));
      assert.ok(!expanded.includes('polls:view_voters'));
    });
  });

  describe('3. Legacy Role Fallback Resolution (getPermissionsForUser)', () => {
    it('should resolve comprehensive governance permissions for legacy Admin role', async () => {
      const adminUser = {
        id: userId.toString(),
        role: 'Community Admin',
        orgId,
      };

      const permissions = await getPermissionsForUser(adminUser);
      assert.ok(permissions.includes('notices:create'));
      assert.ok(permissions.includes('notices:read'));
      assert.ok(permissions.includes('polls:create'));
      assert.ok(permissions.includes('polls:view_voters'));
      assert.ok(permissions.includes('polls:export'));
    });

    it('should resolve voting and reading permissions for legacy Resident role', async () => {
      const residentUser = {
        id: userId.toString(),
        role: 'Resident',
        orgId,
      };

      const permissions = await getPermissionsForUser(residentUser);
      assert.ok(permissions.includes('notices:read'));
      assert.ok(permissions.includes('notices:acknowledge'));
      assert.ok(permissions.includes('polls:read'));
      assert.ok(permissions.includes('polls:vote'));
      assert.ok(!permissions.includes('notices:create'));
      assert.ok(!permissions.includes('polls:create'));
      assert.ok(!permissions.includes('polls:view_voters'));
    });

    it('should resolve view-only notice permissions for Security Guard role', async () => {
      const guardUser = {
        id: userId.toString(),
        role: 'Security Guard',
        orgId,
      };

      const permissions = await getPermissionsForUser(guardUser);
      assert.ok(permissions.includes('notices:read'));
      assert.ok(!permissions.includes('polls:vote'));
      assert.ok(!permissions.includes('notices:create'));
    });
  });

  describe('4. RBAC Middleware Enforcement (authorizePermission)', () => {
    it('should allow resident to access voting endpoint', async () => {
      const req = {
        user: {
          id: userId.toString(),
          username: 'resident_jane',
          role: 'Resident',
          orgId,
        },
        headers: {},
      };
      const res = {};
      let nextCalled = false;
      let nextError = null;

      const middleware = authorizePermission(['notices', 'polls'], ['polls:vote', 'vote']);
      await middleware(req, res, (err) => {
        nextCalled = true;
        nextError = err;
      });

      assert.ok(nextCalled);
      assert.equal(nextError, undefined);
    });

    it('should deny resident trying to create a notice with 403 Forbidden', async () => {
      const req = {
        user: {
          id: userId.toString(),
          username: 'resident_jane',
          role: 'Resident',
          orgId,
        },
        headers: {},
      };
      const res = {};
      let nextError = null;

      const middleware = authorizePermission('notices', ['manage_notices', 'create']);
      await middleware(req, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError);
      assert.equal(nextError.statusCode, 403);
      assert.ok(nextError.message.includes('do not have permission'));
    });

    it('should deny resident trying to view confidential poll voters with 403 Forbidden', async () => {
      const req = {
        user: {
          id: userId.toString(),
          username: 'resident_jane',
          role: 'Resident',
          orgId,
        },
        headers: {},
      };
      const res = {};
      let nextError = null;

      const middleware = authorizePermission(['notices', 'polls'], ['view_voters', 'polls:view_voters']);
      await middleware(req, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError);
      assert.equal(nextError.statusCode, 403);
    });

    it('should allow Super Admin to bypass all permission checks', async () => {
      const req = {
        user: {
          id: userId.toString(),
          username: 'superadmin',
          role: 'Super Admin',
          orgId,
        },
        headers: {},
      };
      const res = {};
      let nextCalled = false;

      const middleware = authorizePermission('super_restricted_module', 'nuclear_option');
      await middleware(req, res, () => {
        nextCalled = true;
      });

      assert.ok(nextCalled);
    });
  });

  describe('5. Notice Audit Trail Logging', () => {
    it('should log audit event when NOTICE_CREATED is emitted', async () => {
      const originalLogEvent = auditLogService.logEvent;
      let loggedEvent = null;

      try {
        auditLogService.logEvent = async (data) => {
          loggedEvent = data;
          return { _id: new mongoose.Types.ObjectId(), ...data };
        };

        const noticeDoc = {
          _id: new mongoose.Types.ObjectId(),
          orgId,
          title: 'Roof Inspection Notice',
          createdBy: userId,
        };

        noticeEvents.emit('NOTICE_CREATED', noticeDoc);

        // Allow microtask cycle for async listener
        await new Promise((resolve) => setTimeout(resolve, 10));

        assert.ok(loggedEvent);
        assert.equal(loggedEvent.action, 'NOTICE_CREATED');
        assert.equal(loggedEvent.actorId.toString(), userId.toString());
        assert.equal(loggedEvent.metadata.noticeTitle, 'Roof Inspection Notice');
      } finally {
        auditLogService.logEvent = originalLogEvent;
      }
    });

    it('should log audit event without actorId when NOTICE_EXPIRED is emitted', async () => {
      const originalLogEvent = auditLogService.logEvent;
      let loggedEvent = null;

      try {
        auditLogService.logEvent = async (data) => {
          loggedEvent = data;
          return { _id: new mongoose.Types.ObjectId(), ...data };
        };

        const noticeDoc = {
          _id: new mongoose.Types.ObjectId(),
          orgId,
          title: 'Expired Swimming Pool Maintenance',
        };

        noticeEvents.emit('NOTICE_EXPIRED', noticeDoc);

        await new Promise((resolve) => setTimeout(resolve, 10));

        assert.ok(loggedEvent);
        assert.equal(loggedEvent.action, 'NOTICE_EXPIRED');
        assert.equal(loggedEvent.actorId, undefined);
        assert.equal(loggedEvent.metadata.noticeTitle, 'Expired Swimming Pool Maintenance');
      } finally {
        auditLogService.logEvent = originalLogEvent;
      }
    });
  });
});
