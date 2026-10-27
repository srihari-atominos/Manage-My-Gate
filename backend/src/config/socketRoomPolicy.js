import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from './config.js';

/**
 * Decides whether a socket may join a room.
 *
 * Private rooms carry personal and gate data (visitor names, phones, walk-in decisions):
 *   - user:<id>            only that user
 *   - org:<orgId>...       only active members of that community
 *   - org:<orgId>:guards   only members with gate or visitor-admin permission
 * Any other room name keeps its previous behaviour.
 */

const readSocketToken = (socket) => {
  const fromAuth = socket.handshake?.auth?.token;
  if (fromAuth) return String(fromAuth).replace(/^Bearer\s+/i, '').trim();
  const authHeader = socket.handshake?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].trim();
  }
  const queryToken = socket.handshake?.query?.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken.trim();
  }
  const cookie = socket.handshake?.headers?.cookie || '';
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]).trim() : null;
};

/** The authenticated user behind a socket (cached per connection), or null. */
export const resolveSocketIdentity = async (socket) => {
  if (socket.data.identity !== undefined) return socket.data.identity;
  let identity = null;
  try {
    const token = readSocketToken(socket);
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      const userId = String(decoded.id || decoded._id || '');
      if (userId && mongoose.isValidObjectId(userId)) {
        // Verify active user in database if DB connected
        if (mongoose.connection?.readyState === 1) {
          const User = (await import('../features/user/user.model.js')).default;
          const { isUserEmailVerified } = await import('../features/user/user.model.js');
          const userDoc = await User.findById(userId).select('status email emailVerified isEmailVerified roles').lean();
          if (userDoc && userDoc.status === 'Active' && isUserEmailVerified(userDoc)) {
            identity = {
              id: userId,
              isPlatform: decoded.isPlatform === true,
              role: decoded.role || '',
              roles: Array.isArray(decoded.roles) ? decoded.roles : [],
            };
          }
        } else {
          // Fail-closed: do not synthesize identities when DB is unavailable
          identity = null;
        }
      }
    }
  } catch (err) {
    identity = null;
  }
  socket.data.identity = identity;
  return identity;
};

const GATE_PERMISSIONS = new Set(['*', 'visitor:guard', 'visitor:admin']);

const normalizeRoleName = (name) => String(name || '').toLowerCase().replace(/[\s_-]+/g, '');

// Backend dispatchers address staff by canonical role rooms (org:<id>:role:admin, org:<id>:role:facilitymanager),
// while tenants name their roles "Community Admin", "Facility Manager", ... Map every role name to the
// canonical rooms it must receive so a "Community Admin" is not silently excluded from admin broadcasts.
const ROLE_ROOM_ALIASES = {
  admin: ['admin'],
  communityadmin: ['admin'],
  superadmin: ['admin'],
  administrator: ['admin'],
  facilitymanager: ['facilitymanager'],
  manager: ['facilitymanager'],
};

export const getRoleRoomKeys = (roleName) => {
  const norm = normalizeRoleName(roleName);
  if (!norm) return [];
  return [...new Set([norm, ...(ROLE_ROOM_ALIASES[norm] || [])])];
};

const collectMembershipRoleNames = (membership) => {
  const roles = [
    ...(Array.isArray(membership?.roleIds) ? membership.roleIds : []),
    ...(membership?.roleId ? [membership.roleId] : []),
  ].map((r) => r?.name || r);
  if (Array.isArray(membership?.assignments)) {
    membership.assignments.forEach((a) => {
      if (a?.roleName) roles.push(a.roleName);
    });
  }
  return roles.map((r) => String(r || '')).filter(Boolean);
};

/**
 * Rooms a verified member of <orgId> is entitled to receive (role rooms + gate room), derived on the
 * server so clients do not have to guess the exact role-room spelling the backend broadcasts to.
 */
export const getDerivedOrgRooms = async (socket, orgId) => {
  const me = await resolveSocketIdentity(socket);
  if (!me?.id || !orgId || !mongoose.isValidObjectId(orgId)) return [];
  if (mongoose.connection?.readyState !== 1) return [];

  const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
  const membership = await OrgMembership.findOne({ userId: me.id, orgId, status: 'Active' })
    .populate('roleIds', 'name')
    .populate('roleId', 'name')
    .lean();
  if (!membership) return [];

  const rooms = new Set();
  const roleKeys = new Set();
  collectMembershipRoleNames(membership).forEach((name) => {
    getRoleRoomKeys(name).forEach((k) => roleKeys.add(k));
  });
  roleKeys.forEach((k) => rooms.add(`org:${orgId}:role:${k}`));

  const isGuardOrAdmin = ['securityguard', 'guard', 'admin', 'superadmin'].some((k) => roleKeys.has(k));
  let canGate = isGuardOrAdmin;
  if (!canGate) {
    try {
      const { getPermissionsForUser } = await import('../middlewares/rbac.middleware.js');
      const permissions = await getPermissionsForUser({ id: me.id }, orgId);
      canGate = permissions.some((p) => GATE_PERMISSIONS.has(p));
    } catch (err) {
      canGate = false;
    }
  }
  if (canGate) rooms.add(`org:${orgId}:guards`);
  return [...rooms];
};

export const canJoinRoom = async (socket, room) => {
  if (!room || typeof room !== 'string') return false;

  const me = await resolveSocketIdentity(socket);
  if (!me || !me.id) return false;

  // 1. Personal user room: user:<userId>
  if (room.startsWith('user:')) {
    return room === `user:${me.id}`;
  }

  // 2. Organization-scoped rooms: org:<orgId>...
  if (room.startsWith('org:')) {
    const parts = room.split(':');
    const orgId = parts[1];
    if (!orgId || !mongoose.isValidObjectId(orgId)) return false;

    // Platform super admins can inspect any org room
    if (me.isPlatform) return true;

    // Fail-closed if database is unavailable
    if (mongoose.connection?.readyState !== 1) return false;

    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const membership = await OrgMembership.findOne({ userId: me.id, orgId, status: 'Active' })
        .populate('roleIds', 'name')
        .populate('roleId', 'name')
        .lean();

      if (!membership) return false;

      // Gate / Guard room: org:<orgId>:guards
      if (room === `org:${orgId}:guards`) {
        const memberRoles = [
          ...(Array.isArray(membership.roleIds) ? membership.roleIds : []),
          ...(membership.roleId ? [membership.roleId] : []),
        ];
        const isGuardOrAdminRole = memberRoles.some((r) => {
          const keys = getRoleRoomKeys(r?.name || r);
          return keys.includes('securityguard') || keys.includes('guard') || keys.includes('admin') || keys.includes('superadmin');
        });
        if (isGuardOrAdminRole) return true;

        const { getPermissionsForUser } = await import('../middlewares/rbac.middleware.js');
        const permissions = await getPermissionsForUser({ id: me.id }, orgId);
        return permissions.some((p) => GATE_PERMISSIONS.has(p));
      }

      // Role-specific org room: org:<orgId>:role:<roleName>
      // SEC-WS-07: Support both roleIds and roleId, plus assignments, with normalized matching
      const roleMatch = room.match(/^org:[a-f\d]{24}:role:(.+)$/i);
      if (roleMatch) {
        const requestedRoleNorm = roleMatch[1].toLowerCase().replace(/[\s_-]+/g, '');
        const memberRoles = [];
        if (membership.roleIds && Array.isArray(membership.roleIds)) {
          memberRoles.push(...membership.roleIds);
        }
        if (membership.roleId) {
          memberRoles.push(membership.roleId);
        }
        if (Array.isArray(membership.assignments)) {
          membership.assignments.forEach((a) => {
            if (a?.roleName) memberRoles.push({ name: a.roleName });
          });
        }
        return memberRoles.some((r) => getRoleRoomKeys(r?.name || r).includes(requestedRoleNorm));
      }

      // Root org room: org:<orgId>
      if (room === `org:${orgId}`) {
        return true;
      }

      // Sub-domain org room pattern (e.g. org:<orgId>:billing) - default-deny unrecognized sub-rooms
      return false;
    } catch (err) {
      return false;
    }
  }

  // 3. Global platform role rooms: role:<roleName> (Admin, Super Admin, Sales Executive)
  // SEC-WS-02: Strictly restrict global role rooms to verified platform users
  if (room.startsWith('role:')) {
    if (!me.isPlatform) return false;

    const requestedRole = room.substring(5).toLowerCase().replace(/[\s_-]+/g, '');
    const allowedPlatformRoles = ['superadmin', 'admin', 'salesexecutive'];
    if (!allowedPlatformRoles.includes(requestedRole)) return false;

    if (mongoose.connection?.readyState !== 1) return false;

    try {
      const User = (await import('../features/user/user.model.js')).default;
      const user = await User.findById(me.id).populate('roles', 'name orgId isTenantRole').lean();
      if (!user) return false;

      if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some((r) => {
          if (!r || r.orgId || r.isTenantRole) return false;
          const rName = String(r.name || '').toLowerCase().replace(/[\s_-]+/g, '');
          return rName === requestedRole || (rName === 'superadmin' && requestedRole === 'admin');
        });
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  // 4. Villa / Unit rooms: villa:<villaId>
  if (room.startsWith('villa:')) {
    const villaId = room.substring(6);
    if (!villaId || !mongoose.isValidObjectId(villaId)) return false;

    if (me.isPlatform) return true;
    if (mongoose.connection?.readyState !== 1) return false;

    try {
      const Villa = (await import('../features/villa/villa.model.js')).default;
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;

      // Find villa and ensure user is resident or unit owner
      const villa = await Villa.findById(villaId).lean();
      if (!villa) return false;

      // Check if user has active membership in this villa's organization
      const membership = await OrgMembership.findOne({
        userId: me.id,
        orgId: villa.orgId,
        status: 'Active',
      }).lean();
      if (!membership) return false;

      // Resident or Owner of this specific unit, or admin/guard in this org
      const isDirectResident =
        String(villa.primaryResidentId || '') === me.id ||
        String(villa.ownerId || '') === me.id ||
        (Array.isArray(villa.residents) && villa.residents.some((r) => String(r.userId || '') === me.id)) ||
        String(membership.villaId || membership.unitId || '') === villaId;

      if (isDirectResident) return true;

      // Check if user has staff/admin permissions in this organization
      const { getPermissionsForUser } = await import('../middlewares/rbac.middleware.js');
      const perms = await getPermissionsForUser({ id: me.id }, villa.orgId);
      return perms.some((p) => p === '*' || p === 'villa:read' || p === 'visitor:guard' || p === 'visitor:admin');
    } catch (err) {
      return false;
    }
  }

  // 5. Amenity rooms: amenity:<orgId>:<amenityId>
  if (room.startsWith('amenity:')) {
    const parts = room.split(':');
    const orgId = parts[1];
    const amenityId = parts[2];
    if (!orgId || !amenityId || !mongoose.isValidObjectId(orgId) || !mongoose.isValidObjectId(amenityId)) {
      return false;
    }

    if (me.isPlatform) return true;
    if (mongoose.connection?.readyState !== 1) return false;

    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const membership = await OrgMembership.findOne({ userId: me.id, orgId, status: 'Active' }).lean();
      return Boolean(membership);
    } catch (err) {
      return false;
    }
  }

  // Default-deny all unrecognised room patterns
  return false;
};
