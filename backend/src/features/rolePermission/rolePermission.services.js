import rolePermissionRepository from './rolePermission.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import { messageBroker } from '../../utils/messageBroker.util.js';
import logger from '../../utils/logger.utils.js';

export class RolePermissionService {
  constructor(options = {}) {
    this.localCache = new Map();
    this.ttlMs = options.ttlMs || parseInt(process.env.RBAC_CACHE_TTL_MS, 10) || 300 * 1000; // 5 minutes default
    this._boundInvalidateHandler = this._handleInvalidateEvent.bind(this);

    // Subscribe to cluster cache invalidation events
    try {
      if (messageBroker && typeof messageBroker.subscribeEvent === 'function') {
        messageBroker.subscribeEvent('rbac:cache:invalidate', this._boundInvalidateHandler);
      }
    } catch (err) {
      // Safe fallback if messageBroker fails to initialize in unit tests
    }
  }

  /**
   * Internal handler for cluster invalidation events broadcast by other application pods
   */
  _handleInvalidateEvent(payload) {
    if (!payload) return;
    this._evictLocal(payload.roleId, payload.orgId);
  }

  /**
   * Build tenant-partitioned cache key
   */
  buildCacheKey(roleId, orgId = null) {
    const sRoleId = roleId ? roleId.toString() : '';
    if (orgId) {
      return `rbac:perms:${orgId.toString()}:${sRoleId}`;
    }
    return `rbac:perms:system:${sRoleId}`;
  }

  /**
   * Evict from in-memory cache with matching roleId or orgId
   */
  _evictLocal(roleId = null, orgId = null) {
    if (!roleId && !orgId) {
      this.localCache.clear();
      return;
    }

    const sRoleId = roleId ? roleId.toString() : null;
    const sOrgId = orgId ? orgId.toString() : null;

    for (const key of Array.from(this.localCache.keys())) {
      const parts = key.split(':');
      // format: rbac:perms:<orgIdOrSystem>:<roleId>
      const keyOrg = parts[2];
      const keyRole = parts[3];

      let shouldDelete = false;
      if (sRoleId && keyRole === sRoleId) {
        shouldDelete = true;
      }
      if (sOrgId && keyOrg === sOrgId && !sRoleId) {
        shouldDelete = true;
      }
      if (shouldDelete) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * Retrieve valid unexpired item from local cache
   */
  _getLocal(key) {
    const entry = this.localCache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.localCache.delete(key);
      return undefined;
    }
    return entry.permissions;
  }

  /**
   * Store item in local cache with TTL
   */
  _setLocal(key, permissions) {
    if (this.localCache.size > 10000) {
      const now = Date.now();
      for (const [k, v] of this.localCache.entries()) {
        if (now > v.expiresAt) {
          this.localCache.delete(k);
        }
      }
    }
    this.localCache.set(key, {
      permissions,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Retrieve item from Redis cache (fail-soft to DB)
   */
  async _getRedis(key) {
    try {
      if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
        const data = await messageBroker.publisher.get(key);
        if (data) {
          return JSON.parse(data);
        }
      }
    } catch (err) {
      logger.warn(`[RolePermissionService] Redis cache get failed for ${key}: ${err.message}`);
    }
    return null;
  }

  /**
   * Write item to Redis cache with TTL (fail-soft)
   */
  async _setRedis(key, permissions) {
    try {
      if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
        const ttlSec = Math.max(1, Math.floor(this.ttlMs / 1000));
        await messageBroker.publisher.set(key, JSON.stringify(permissions), 'EX', ttlSec);
      }
    } catch (err) {
      logger.warn(`[RolePermissionService] Redis cache set failed for ${key}: ${err.message}`);
    }
  }

  /**
   * Invalidate Redis keys by exact key or pattern
   */
  async _delRedis(patternOrKey) {
    try {
      if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
        if (patternOrKey.includes('*')) {
          let cursor = '0';
          do {
            const [nextCursor, keys] = await messageBroker.publisher.scan(cursor, 'MATCH', patternOrKey, 'COUNT', 100);
            cursor = nextCursor;
            if (keys && keys.length > 0) {
              await messageBroker.publisher.del(...keys);
            }
          } while (cursor !== '0');
        } else {
          await messageBroker.publisher.del(patternOrKey);
        }
      }
    } catch (err) {
      logger.warn(`[RolePermissionService] Redis cache del failed for ${patternOrKey}: ${err.message}`);
    }
  }

  /**
   * Comprehensive cache invalidator across local memory, Redis, and cluster nodes
   */
  async clearCache(roleId = null, orgId = null, broadcast = true) {
    const sRoleId = roleId ? roleId.toString() : null;
    let sOrgId = orgId ? orgId.toString() : null;

    if (sRoleId && !sOrgId) {
      try {
        const Role = (await import('../role/role.model.js')).default;
        const roleDoc = await Role.findById(sRoleId).select('orgId isTenantRole').lean();
        if (roleDoc?.orgId) {
          sOrgId = roleDoc.orgId.toString();
        }
      } catch (err) {
        // Fall back to wildcard matching
      }
    }

    // 1. Evict local
    this._evictLocal(sRoleId, sOrgId);

    // 2. Evict Redis
    let redisPattern = null;
    if (sOrgId && sRoleId) {
      redisPattern = `rbac:perms:${sOrgId}:${sRoleId}`;
    } else if (sOrgId && !sRoleId) {
      redisPattern = `rbac:perms:${sOrgId}:*`;
    } else if (!sOrgId && sRoleId) {
      redisPattern = `rbac:perms:*:${sRoleId}`;
    } else {
      redisPattern = `rbac:perms:*`;
    }
    await this._delRedis(redisPattern);

    if (sRoleId) {
      await this._delRedis(`rbac:perms:system:${sRoleId}`);
    }

    // 3. Broadcast to cluster pods via messageBroker
    if (broadcast) {
      try {
        if (messageBroker && typeof messageBroker.publishEvent === 'function') {
          await messageBroker.publishEvent('rbac:cache:invalidate', {
            roleId: sRoleId,
            orgId: sOrgId,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        logger.warn(`[RolePermissionService] Failed to publish cache invalidation: ${err.message}`);
      }
    }
  }

  /**
   * Backward-compatibility proxy for legacy callers that directly manipulate `this.cache`
   */
  get cache() {
    const self = this;
    return {
      get(key) {
        return self._getLocal(key);
      },
      set(key, val) {
        self._setLocal(key, val);
        return this;
      },
      has(key) {
        return self._getLocal(key) !== undefined;
      },
      delete(key) {
        self.clearCache(key);
        return true;
      },
      clear() {
        self.clearCache();
      },
      get size() {
        return self.localCache.size;
      },
    };
  }

  /**
   * Helper to fetch populated permissions from DB repository
   */
  async _fetchAndFormatPermissions(roleId) {
    try {
      const mappings = await rolePermissionRepository.findByRoleId(roleId);
      if (!Array.isArray(mappings)) return [];
      return mappings
        .map((m) => m.permissionId)
        .filter((p) => p !== null && p !== undefined);
    } catch (err) {
      logger.error(`[RolePermissionService] DB fetch failed for role ${roleId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Retrieve permissions for a role, strictly isolated by tenant organization.
   * Fails closed if cross-tenant violation or invalid context is detected.
   */
  async getPermissionsByRoleId(roleId, targetOrgId = null) {
    if (!roleId) return [];

    const sRoleId = roleId.toString();
    const sOrgId = targetOrgId ? targetOrgId.toString() : null;

    // Cache keys to check
    const tenantKey = sOrgId ? this.buildCacheKey(sRoleId, sOrgId) : null;
    const systemKey = this.buildCacheKey(sRoleId, null);

    // 1. Check local memory cache
    if (tenantKey) {
      const localCached = this._getLocal(tenantKey);
      if (localCached !== undefined) return localCached;
    }
    const localSystemCached = this._getLocal(systemKey);
    if (localSystemCached !== undefined) return localSystemCached;

    // 2. Check Redis cache (fail-soft to DB)
    try {
      if (tenantKey) {
        const redisCached = await this._getRedis(tenantKey);
        if (redisCached !== null) {
          this._setLocal(tenantKey, redisCached);
          return redisCached;
        }
      }
      const redisSystemCached = await this._getRedis(systemKey);
      if (redisSystemCached !== null) {
        this._setLocal(systemKey, redisSystemCached);
        return redisSystemCached;
      }
    } catch (err) {
      logger.warn(`[RolePermissionService] Redis cache lookup failed: ${err.message}`);
    }

    // 3. Cache miss: DB Lookup & Tenant Boundary Enforcement
    let roleDoc;
    try {
      const Role = (await import('../role/role.model.js')).default;
      roleDoc = await Role.findById(sRoleId).select('_id orgId isTenantRole').lean();
    } catch (err) {
      logger.error(`[RolePermissionService] Role lookup failed for ${sRoleId}: ${err.message}`);
      return []; // Fail closed
    }

    if (!roleDoc) {
      return []; // Role does not exist -> Fail closed
    }

    // Tenant isolation verification
    if (roleDoc.orgId) {
      // Role is owned by a specific organization
      if (!sOrgId || roleDoc.orgId.toString() !== sOrgId) {
        // Cross-tenant access attempt or missing organization context -> Fail closed
        return [];
      }
      try {
        const permissions = await this._fetchAndFormatPermissions(sRoleId);
        this._setLocal(tenantKey, permissions);
        await this._setRedis(tenantKey, permissions);
        return permissions;
      } catch (err) {
        logger.error(`[RolePermissionService] Failed to fetch permissions for tenant role ${sRoleId}: ${err.message}`);
        return []; // Fail closed
      }
    }

    if (roleDoc.isTenantRole === false) {
      // System template role (platform/system baseline)
      try {
        const permissions = await this._fetchAndFormatPermissions(sRoleId);
        this._setLocal(systemKey, permissions);
        await this._setRedis(systemKey, permissions);
        return permissions;
      } catch (err) {
        logger.error(`[RolePermissionService] Failed to fetch permissions for system role ${sRoleId}: ${err.message}`);
        return []; // Fail closed
      }
    }

    // Tenant role with missing orgId -> Fail closed
    return [];
  }

  async assignPermissionToRole(roleId, permissionId) {
    try {
      const result = await rolePermissionRepository.create(roleId, permissionId);
      await this.clearCache(roleId);
      return result;
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpError(400, 'This permission is already assigned to this role.');
      }
      throw error;
    }
  }

  async removePermissionFromRole(roleId, permissionId) {
    const deleted = await rolePermissionRepository.deleteByRoleIdAndPermissionId(roleId, permissionId);
    if (!deleted) {
      throw new HttpError(404, 'Permission mapping not found.');
    }
    await this.clearCache(roleId);
    return deleted;
  }

  async updateRolePermissions(roleId, permissionIds, session = null) {
    await rolePermissionRepository.deleteByRoleId(roleId, session);
    await this.clearCache(roleId);

    if (permissionIds && permissionIds.length > 0) {
      const records = permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }));
      const result = await rolePermissionRepository.bulkCreate(records, session);
      await this.clearCache(roleId);
      return result;
    }
    return [];
  }
}

export default new RolePermissionService();
