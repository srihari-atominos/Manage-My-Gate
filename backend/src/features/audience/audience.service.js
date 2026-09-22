import mongoose from 'mongoose';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';
import { AUDIENCE_TARGET_TYPES, VALID_TARGET_TYPES, DEFAULT_RESIDENCY_TYPES } from './audience.constants.js';
import orgMembershipService from '../orgMembership/orgMembership.services.js';
import villaService from '../villa/villa.services.js';
import roleService from '../role/role.services.js';

export class AudienceService {
  /**
   * @param {Object} [deps={}]
   * @param {Object} [deps.orgMembershipService]
   * @param {Object} [deps.villaService]
   * @param {Object} [deps.roleService]
   */
  constructor(deps = {}) {
    this.orgMembershipService = deps.orgMembershipService || orgMembershipService;
    this.villaService = deps.villaService || villaService;
    this.roleService = deps.roleService || roleService;
  }

  /**
   * Validates targetAudience payload before saving.
   * Ensures all referenced roles, units, blocks, and users exist and belong to the specified community.
   *
   * @param {Object} targetAudience - Audience targeting configuration
   * @param {string|mongoose.Types.ObjectId} orgId - Organization/Community ID
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>} Normalized targetAudience object
   */
  async validateTarget(targetAudience, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('AudienceService.validateTarget request received', { orgId, correlationId });

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      throw new HttpError(400, 'A valid Organization ID (orgId) is required for audience validation.');
    }

    const orgIdStr = orgId.toString();

    // Missing, null, or empty targetAudience defaults to ALL (backward compatibility)
    if (!targetAudience || !targetAudience.targetType || targetAudience.targetType === AUDIENCE_TARGET_TYPES.ALL) {
      return {
        targetType: AUDIENCE_TARGET_TYPES.ALL,
        targetRoles: [],
        targetBlocks: [],
        targetUnits: [],
        targetResidencyTypes: [],
        targetUsers: [],
        ruleGroups: [],
      };
    }

    const {
      targetType,
      targetRoles = [],
      targetBlocks = [],
      targetUnits = [],
      targetResidencyTypes = [],
      targetUsers = [],
      ruleGroups = [],
    } = targetAudience;

    if (!VALID_TARGET_TYPES.includes(targetType)) {
      throw new HttpError(
        400,
        `Invalid targetType "${targetType}". Must be one of: ${VALID_TARGET_TYPES.join(', ')}.`
      );
    }

    // Helper to validate ObjectId format
    const ensureValidObjectIds = (ids, fieldName) => {
      if (!Array.isArray(ids)) {
        throw new HttpError(400, `${fieldName} must be an array.`);
      }
      for (const id of ids) {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Malformed ObjectId "${id}" found in ${fieldName}.`);
        }
      }
    };

    switch (targetType) {
      case AUDIENCE_TARGET_TYPES.ROLES: {
        if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
          throw new HttpError(400, 'targetRoles must be a non-empty array of Role IDs when targetType is ROLES.');
        }
        ensureValidObjectIds(targetRoles, 'targetRoles');

        const roles = await this.roleService.getRolesByIds(targetRoles, session);
        if (roles.length !== targetRoles.length) {
          throw new HttpError(400, 'One or more target roles were not found.');
        }

        // Validate tenant isolation: Role must belong to this org or be a system role (orgId is null/undefined)
        for (const role of roles) {
          if (role.orgId && role.orgId.toString() !== orgIdStr) {
            throw new HttpError(400, `Role "${role.name}" (${role._id}) belongs to another organization.`);
          }
        }
        break;
      }

      case AUDIENCE_TARGET_TYPES.BLOCKS: {
        if (!Array.isArray(targetBlocks) || targetBlocks.length === 0) {
          throw new HttpError(400, 'targetBlocks must be a non-empty array of block names when targetType is BLOCKS.');
        }

        const trimmedBlocks = targetBlocks.map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean);
        if (trimmedBlocks.length !== targetBlocks.length) {
          throw new HttpError(400, 'targetBlocks must contain non-empty string values.');
        }

        const distinctBlocks = await this.villaService.getDistinctBlocks(orgId);
        const invalidBlocks = trimmedBlocks.filter((b) => !distinctBlocks.includes(b));
        if (invalidBlocks.length > 0) {
          throw new HttpError(
            400,
            `The following target blocks do not exist in this community: ${invalidBlocks.join(', ')}.`
          );
        }
        break;
      }

      case AUDIENCE_TARGET_TYPES.UNITS: {
        if (!Array.isArray(targetUnits) || targetUnits.length === 0) {
          throw new HttpError(400, 'targetUnits must be a non-empty array of Unit IDs when targetType is UNITS.');
        }
        ensureValidObjectIds(targetUnits, 'targetUnits');

        const units = await this.villaService.getUnitsByVillaIds(targetUnits, orgId, session);
        if (units.length !== targetUnits.length) {
          throw new HttpError(
            400,
            'One or more target units are invalid, missing, or do not belong to this community.'
          );
        }
        break;
      }

      case AUDIENCE_TARGET_TYPES.RESIDENCY_TYPES: {
        if (!Array.isArray(targetResidencyTypes) || targetResidencyTypes.length === 0) {
          throw new HttpError(
            400,
            'targetResidencyTypes must be a non-empty array when targetType is RESIDENCY_TYPES.'
          );
        }
        for (const rt of targetResidencyTypes) {
          if (!rt || typeof rt !== 'string' || !rt.trim()) {
            throw new HttpError(400, 'targetResidencyTypes must contain non-empty string values.');
          }
        }
        break;
      }

      case AUDIENCE_TARGET_TYPES.CUSTOM: {
        if (!Array.isArray(targetUsers) || targetUsers.length === 0) {
          throw new HttpError(400, 'targetUsers must be a non-empty array of User IDs when targetType is CUSTOM.');
        }
        ensureValidObjectIds(targetUsers, 'targetUsers');

        const activeUserIds = await this.orgMembershipService.getActiveUserIds(
          orgId,
          { userId: { $in: targetUsers } },
          session
        );

        if (activeUserIds.length !== targetUsers.length) {
          throw new HttpError(
            400,
            'One or more target users do not have an active membership in this community.'
          );
        }
        break;
      }

      default:
        break;
    }

    // Validate ruleGroups if present
    const normalizedRuleGroups = [];
    if (Array.isArray(ruleGroups) && ruleGroups.length > 0) {
      for (let i = 0; i < ruleGroups.length; i++) {
        const group = ruleGroups[i];
        if (!group || typeof group !== 'object') {
          throw new HttpError(400, `Rule group at index ${i} must be an object.`);
        }

        const { roles = [], blocks = [], units = [], residencyTypes = [], users = [] } = group;

        if (
          roles.length === 0 &&
          blocks.length === 0 &&
          units.length === 0 &&
          residencyTypes.length === 0 &&
          users.length === 0
        ) {
          throw new HttpError(400, `Rule group at index ${i} must define at least one targeting criteria.`);
        }

        if (roles.length > 0) {
          ensureValidObjectIds(roles, `ruleGroups[${i}].roles`);
          const fetchedRoles = await this.roleService.getRolesByIds(roles, session);
          if (fetchedRoles.length !== roles.length) {
            throw new HttpError(400, `One or more roles in rule group ${i} are invalid.`);
          }
          for (const role of fetchedRoles) {
            if (role.orgId && role.orgId.toString() !== orgIdStr) {
              throw new HttpError(400, `Role in rule group ${i} belongs to another organization.`);
            }
          }
        }

        if (blocks.length > 0) {
          const distinctBlocks = await this.villaService.getDistinctBlocks(orgId);
          const invalid = blocks.filter((b) => !distinctBlocks.includes(b));
          if (invalid.length > 0) {
            throw new HttpError(400, `Block(s) "${invalid.join(', ')}" in rule group ${i} do not exist in this community.`);
          }
        }

        if (units.length > 0) {
          ensureValidObjectIds(units, `ruleGroups[${i}].units`);
          const fetchedUnits = await this.villaService.getUnitsByVillaIds(units, orgId, session);
          if (fetchedUnits.length !== units.length) {
            throw new HttpError(400, `One or more units in rule group ${i} are invalid or belong to another community.`);
          }
        }

        if (users.length > 0) {
          ensureValidObjectIds(users, `ruleGroups[${i}].users`);
          const activeIds = await this.orgMembershipService.getActiveUserIds(
            orgId,
            { userId: { $in: users } },
            session
          );
          if (activeIds.length !== users.length) {
            throw new HttpError(400, `One or more users in rule group ${i} do not have active membership in this community.`);
          }
        }

        normalizedRuleGroups.push({
          roles: roles.map((r) => new mongoose.Types.ObjectId(r)),
          blocks: blocks.map((b) => b.trim()),
          units: units.map((u) => new mongoose.Types.ObjectId(u)),
          residencyTypes: residencyTypes.map((rt) => rt.trim()),
          users: users.map((u) => new mongoose.Types.ObjectId(u)),
        });
      }
    }

    return {
      targetType,
      targetRoles: targetRoles.map((r) => new mongoose.Types.ObjectId(r)),
      targetBlocks: targetBlocks.map((b) => (typeof b === 'string' ? b.trim() : b)),
      targetUnits: targetUnits.map((u) => new mongoose.Types.ObjectId(u)),
      targetResidencyTypes: targetResidencyTypes.map((rt) => (typeof rt === 'string' ? rt.trim() : rt)),
      targetUsers: targetUsers.map((u) => new mongoose.Types.ObjectId(u)),
      ruleGroups: normalizedRuleGroups,
    };
  }

  /**
   * Resolves the user context required for audience evaluation.
   *
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object|null>} Resolved user context or null if not an active member
   */
  async getUserContext(userOrId, orgId, session = null) {
    if (!userOrId || !orgId) return null;

    // Safely extract primitive userId if an object/req.user was passed
    const userId = (typeof userOrId === 'object' && userOrId !== null && !(userOrId instanceof mongoose.Types.ObjectId))
      ? (userOrId.userId || userOrId.id || userOrId._id)
      : userOrId;

    if (!userId) return null;

    const membership = await this.orgMembershipService.getMembershipWithVilla(userId, orgId, session);
    if (!membership || membership.status !== 'Active') {
      return null;
    }

    const roleIdsSet = new Set();
    if (membership.roleId) roleIdsSet.add(membership.roleId.toString());
    if (Array.isArray(membership.roleIds)) {
      membership.roleIds.forEach((r) => r && roleIdsSet.add(r.toString()));
    }

    const units = [];
    const unitIdsSet = new Set();
    const blocksSet = new Set();
    const residencyTypesSet = new Set();

    // Check modern units array
    if (Array.isArray(membership.units)) {
      for (const u of membership.units) {
        if (u && u.villaId) {
          const villa = u.villaId;
          const villaId = villa._id ? villa._id.toString() : villa.toString();
          const block = villa.blockOrBuilding || villa.block || '';
          const residentType = u.residentType || 'None';

          units.push({ villaId, block, residentType });
          unitIdsSet.add(villaId);
          if (block) blocksSet.add(block);
          if (residentType) residencyTypesSet.add(residentType);
        }
      }
    }

    // Backward compatibility: check legacy single villaId / residentType
    if (membership.villaId) {
      const villa = membership.villaId;
      const villaId = villa._id ? villa._id.toString() : villa.toString();
      const block = villa.blockOrBuilding || villa.block || '';
      const residentType = membership.residentType || 'None';

      if (!unitIdsSet.has(villaId)) {
        units.push({ villaId, block, residentType });
        unitIdsSet.add(villaId);
        if (block) blocksSet.add(block);
        if (residentType) residencyTypesSet.add(residentType);
      }
    }

    return {
      userId: userId.toString(),
      orgId: orgId.toString(),
      roleIds: Array.from(roleIdsSet),
      units,
      unitIds: Array.from(unitIdsSet),
      blocks: Array.from(blocksSet),
      residencyTypes: Array.from(residencyTypesSet),
      status: membership.status,
    };
  }

  /**
   * Evaluates if a single rule group matches a resolved user context.
   * Rule group evaluation enforces:
   * - AND within the rule group (all specified criteria must match)
   *
   * @param {Object} userContext
   * @param {Object} group
   * @returns {boolean}
   * @private
   */
  _evaluateRuleGroup(userContext, group) {
    if (!userContext || !group) return false;

    const { roles = [], blocks = [], units = [], residencyTypes = [], users = [] } = group;

    // 1. Roles check (if defined in rule group)
    if (roles.length > 0) {
      const groupRoleStrs = roles.map((r) => r.toString());
      const hasMatchingRole = userContext.roleIds.some((ur) => groupRoleStrs.includes(ur));
      if (!hasMatchingRole) return false;
    }

    // 2. Custom users check (if defined in rule group)
    if (users.length > 0) {
      const groupUserStrs = users.map((u) => u.toString());
      if (!groupUserStrs.includes(userContext.userId)) return false;
    }

    // 3. Unit-level combination check (blocks, units, residencyTypes)
    const hasUnitConstraints = blocks.length > 0 || units.length > 0 || residencyTypes.length > 0;
    if (hasUnitConstraints) {
      const groupBlockStrs = blocks.map((b) => (typeof b === 'string' ? b.trim() : b));
      const groupUnitStrs = units.map((u) => u.toString());
      const groupResTypeStrs = residencyTypes.map((rt) => (typeof rt === 'string' ? rt.trim() : rt));

      // At least one of the user's assigned units must satisfy ALL unit-level constraints present
      const satisfiesUnitCriteria = userContext.units.some((u) => {
        if (groupBlockStrs.length > 0 && !groupBlockStrs.includes(u.block)) return false;
        if (groupUnitStrs.length > 0 && !groupUnitStrs.includes(u.villaId)) return false;
        if (groupResTypeStrs.length > 0 && !groupResTypeStrs.includes(u.residentType)) return false;
        return true;
      });

      if (!satisfiesUnitCriteria) return false;
    }

    return true;
  }

  /**
   * Determines whether a specific user is eligible for a targeted Notice or Poll.
   *
   * @param {Object|string|mongoose.Types.ObjectId} userOrContext - Resolved user context OR userId
   * @param {Object} targetAudience - Audience targeting configuration
   * @param {string|mongoose.Types.ObjectId} [orgId=null] - Required if userOrContext is a userId
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<boolean>}
   */
  async checkEligibility(userOrContext, targetAudience, orgId = null, session = null) {
    // 1. Backward compatibility: Missing or ALL targetAudience is visible to all active users
    if (!targetAudience || !targetAudience.targetType || targetAudience.targetType === AUDIENCE_TARGET_TYPES.ALL) {
      return true;
    }

    // 2. Community Admin, Super Admin, and Admins can ALWAYS view and access all notices in their community
    const adminRoleNames = ['Community Admin', 'Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'];
    if (userOrContext && typeof userOrContext === 'object') {
      const r = (userOrContext.role || '').trim();
      const roles = Array.isArray(userOrContext.roles) ? userOrContext.roles : [];
      if (adminRoleNames.includes(r) || roles.some((role) => adminRoleNames.includes(role))) {
        return true;
      }
    }

    let userContext = null;
    if (userOrContext && typeof userOrContext === 'object' && userOrContext.userId && userOrContext.roleIds) {
      userContext = userOrContext;
    } else if (userOrContext) {
      const rawUserId = (typeof userOrContext === 'object' && userOrContext !== null)
        ? (userOrContext.userId || userOrContext.id || userOrContext._id)
        : userOrContext;
      userContext = await this.getUserContext(rawUserId, orgId, session);
    }

    if (!userContext || userContext.status !== 'Active') {
      return false;
    }

    if (userContext.roleIds && userContext.roleIds.length > 0) {
      const Role = (await import('../role/role.model.js')).default;
      const adminRoleCount = await Role.countDocuments({
        _id: { $in: userContext.roleIds },
        name: { $in: adminRoleNames },
      }).session(session);
      if (adminRoleCount > 0) {
        return true;
      }
    }
    if (userContext.userId) {
      const User = mongoose.model('User');
      const user = await User.findById(userContext.userId).session(session).lean();
      if (user && adminRoleNames.includes(user.role)) {
        return true;
      }
    }

    // If ruleGroups are defined, evaluate: OR across rule groups
    if (Array.isArray(targetAudience.ruleGroups) && targetAudience.ruleGroups.length > 0) {
      return targetAudience.ruleGroups.some((group) => this._evaluateRuleGroup(userContext, group));
    }

    switch (targetAudience.targetType) {
      case AUDIENCE_TARGET_TYPES.ROLES: {
        const targetRoles = (targetAudience.targetRoles || []).map((r) => r.toString());
        return userContext.roleIds.some((r) => targetRoles.includes(r));
      }

      case AUDIENCE_TARGET_TYPES.BLOCKS: {
        const targetBlocks = targetAudience.targetBlocks || [];
        return userContext.blocks.some((b) => targetBlocks.includes(b));
      }

      case AUDIENCE_TARGET_TYPES.UNITS: {
        const targetUnits = (targetAudience.targetUnits || []).map((u) => u.toString());
        return userContext.unitIds.some((u) => targetUnits.includes(u));
      }

      case AUDIENCE_TARGET_TYPES.RESIDENCY_TYPES: {
        const targetResTypes = targetAudience.targetResidencyTypes || [];
        return userContext.residencyTypes.some((rt) => targetResTypes.includes(rt));
      }

      case AUDIENCE_TARGET_TYPES.CUSTOM: {
        const targetUsers = (targetAudience.targetUsers || []).map((u) => u.toString());
        return targetUsers.includes(userContext.userId);
      }

      default:
        return false;
    }
  }

  /**
   * Builds a MongoDB query filter to be merged into Notice or Poll queries.
   * Ensures only items visible to this user within the community are returned.
   *
   * @param {Object|string|mongoose.Types.ObjectId} userOrContext - Resolved user context OR userId
   * @param {string|mongoose.Types.ObjectId} orgId - Organization ID
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>} MongoDB filter query object
   */
  async buildFeedFilter(userOrContext, orgId, sessionOrFieldPrefix = null, maybeSession = null) {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID (orgId) is required to build feed filter.');
    }

    const session = (sessionOrFieldPrefix && typeof sessionOrFieldPrefix === 'object' && typeof sessionOrFieldPrefix.startTransaction === 'function')
      ? sessionOrFieldPrefix
      : (maybeSession && typeof maybeSession === 'object' && typeof maybeSession.startTransaction === 'function' ? maybeSession : null);

    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    // Community Admin, Super Admin, and Admins have full visibility to all notices in their community
    const adminRoleNames = ['Community Admin', 'Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'];
    if (userOrContext && typeof userOrContext === 'object') {
      const r = (userOrContext.role || '').trim();
      const roles = Array.isArray(userOrContext.roles) ? userOrContext.roles : [];
      if (adminRoleNames.includes(r) || roles.some((role) => adminRoleNames.includes(role))) {
        return {
          orgId: orgObjectId,
        };
      }
    }

    let userContext = null;
    if (userOrContext && typeof userOrContext === 'object' && userOrContext.userId && userOrContext.roleIds) {
      userContext = userOrContext;
    } else if (userOrContext) {
      const rawUserId = (typeof userOrContext === 'object' && userOrContext !== null)
        ? (userOrContext.userId || userOrContext.id || userOrContext._id)
        : userOrContext;
      userContext = await this.getUserContext(rawUserId, orgId, session);
    }

    // Default base: ALL or missing targetAudience is visible to any community member
    const baseAudienceClauses = [
      { targetAudience: null },
      { targetAudience: { $exists: false } },
      { 'targetAudience.targetType': AUDIENCE_TARGET_TYPES.ALL },
      { 'targetAudience.targetType': { $exists: false } },
    ];

    if (!userContext || userContext.status !== 'Active') {
      return {
        orgId: orgObjectId,
        $or: baseAudienceClauses,
      };
    }

    // Community Admin, Super Admin, and Admins have full visibility to all notices in their community
    let isAdmin = false;
    if (userOrContext && typeof userOrContext === 'object') {
      const r = (userOrContext.role || '').trim();
      const roles = Array.isArray(userOrContext.roles) ? userOrContext.roles : [];
      if (adminRoleNames.includes(r) || roles.some((role) => adminRoleNames.includes(role))) {
        isAdmin = true;
      }
    }
    if (!isAdmin && userContext && userContext.roleIds && userContext.roleIds.length > 0) {
      const Role = (await import('../role/role.model.js')).default;
      const adminRoleCount = await Role.countDocuments({
        _id: { $in: userContext.roleIds },
        name: { $in: adminRoleNames },
      }).session(session);
      if (adminRoleCount > 0) {
        isAdmin = true;
      }
    }
    if (!isAdmin && userContext && userContext.userId) {
      const User = mongoose.model('User');
      const user = await User.findById(userContext.userId).session(session).lean();
      if (user && adminRoleNames.includes(user.role)) {
        isAdmin = true;
      }
    }
    if (isAdmin) {
      return {
        orgId: orgObjectId,
      };
    }

    const orClauses = [...baseAudienceClauses];

    // 1. Roles clause
    if (userContext.roleIds.length > 0) {
      const roleObjectIds = userContext.roleIds.map((r) => new mongoose.Types.ObjectId(r));
      orClauses.push({
        'targetAudience.targetType': AUDIENCE_TARGET_TYPES.ROLES,
        'targetAudience.targetRoles': { $in: roleObjectIds },
      });
    }

    // 2. Blocks clause
    if (userContext.blocks.length > 0) {
      orClauses.push({
        'targetAudience.targetType': AUDIENCE_TARGET_TYPES.BLOCKS,
        'targetAudience.targetBlocks': { $in: userContext.blocks },
      });
    }

    // 3. Units clause
    if (userContext.unitIds.length > 0) {
      const unitObjectIds = userContext.unitIds.map((u) => new mongoose.Types.ObjectId(u));
      orClauses.push({
        'targetAudience.targetType': AUDIENCE_TARGET_TYPES.UNITS,
        'targetAudience.targetUnits': { $in: unitObjectIds },
      });
    }

    // 4. Residency Types clause
    if (userContext.residencyTypes.length > 0) {
      orClauses.push({
        'targetAudience.targetType': AUDIENCE_TARGET_TYPES.RESIDENCY_TYPES,
        'targetAudience.targetResidencyTypes': { $in: userContext.residencyTypes },
      });
    }

    // 5. Custom user clause
    if (userContext.userId) {
      orClauses.push({
        'targetAudience.targetType': AUDIENCE_TARGET_TYPES.CUSTOM,
        'targetAudience.targetUsers': new mongoose.Types.ObjectId(userContext.userId),
      });
    }

    // 6. Rule groups clauses
    // If a document has ruleGroups, match if at least one rule group matches user attributes
    const ruleGroupConditions = [];
    if (userContext.roleIds.length > 0) {
      ruleGroupConditions.push({ 'roles': { $in: userContext.roleIds.map((r) => new mongoose.Types.ObjectId(r)) } });
    }
    if (userContext.blocks.length > 0) {
      ruleGroupConditions.push({ 'blocks': { $in: userContext.blocks } });
    }
    if (userContext.unitIds.length > 0) {
      ruleGroupConditions.push({ 'units': { $in: userContext.unitIds.map((u) => new mongoose.Types.ObjectId(u)) } });
    }
    if (userContext.residencyTypes.length > 0) {
      ruleGroupConditions.push({ 'residencyTypes': { $in: userContext.residencyTypes } });
    }
    if (userContext.userId) {
      ruleGroupConditions.push({ 'users': new mongoose.Types.ObjectId(userContext.userId) });
    }

    if (ruleGroupConditions.length > 0) {
      orClauses.push({
        'targetAudience.ruleGroups': {
          $elemMatch: {
            $or: ruleGroupConditions,
          },
        },
      });
    }

    return {
      orgId: orgObjectId,
      $or: orClauses,
    };
  }

  /**
   * Resolves the list of active user IDs who should receive notifications for a targeted Notice or Poll.
   * Scoped strictly to the given orgId. Excludes inactive memberships.
   *
   * @param {Object} targetAudience - Audience targeting configuration
   * @param {string|mongoose.Types.ObjectId} orgId - Organization ID
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<string[]>} Deduplicated array of User ID strings
   */
  async resolveRecipients(targetAudience, orgId, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('AudienceService.resolveRecipients request received', { orgId, correlationId });

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      throw new HttpError(400, 'A valid Organization ID (orgId) is required to resolve recipients.');
    }

    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    // If ruleGroups are defined, evaluate via rule group matching (OR across rule groups)
    if (Array.isArray(targetAudience?.ruleGroups) && targetAudience.ruleGroups.length > 0) {
      const activeMemberships = await this.orgMembershipService.getActiveMemberships(orgObjectId, {}, session);
      const recipientIds = new Set();

      for (const m of activeMemberships) {
        if (!m.userId) continue;
        const userContext = await this.getUserContext(m.userId, orgObjectId, session);
        if (userContext && targetAudience.ruleGroups.some((g) => this._evaluateRuleGroup(userContext, g))) {
          recipientIds.add(m.userId.toString());
        }
      }

      return Array.from(recipientIds);
    }

    // Backward compatibility: Missing or ALL targets every active member in the community
    if (!targetAudience || !targetAudience.targetType || targetAudience.targetType === AUDIENCE_TARGET_TYPES.ALL) {
      return await this.orgMembershipService.getActiveUserIds(orgObjectId, {}, session);
    }

    switch (targetAudience.targetType) {
      case AUDIENCE_TARGET_TYPES.ROLES: {
        const roleIds = (targetAudience.targetRoles || []).map((r) => new mongoose.Types.ObjectId(r));
        if (roleIds.length === 0) return [];
        return await this.orgMembershipService.getActiveUserIds(
          orgObjectId,
          {
            $or: [{ roleId: { $in: roleIds } }, { roleIds: { $in: roleIds } }],
          },
          session
        );
      }

      case AUDIENCE_TARGET_TYPES.BLOCKS: {
        const blocks = targetAudience.targetBlocks || [];
        if (blocks.length === 0) return [];
        const villas = await this.villaService.getUnitsByBlockNames(blocks, orgObjectId, session);
        const villaIds = villas.map((v) => v._id);
        if (villaIds.length === 0) return [];

        return await this.orgMembershipService.getActiveUserIds(
          orgObjectId,
          {
            $or: [{ villaId: { $in: villaIds } }, { 'units.villaId': { $in: villaIds } }],
          },
          session
        );
      }

      case AUDIENCE_TARGET_TYPES.UNITS: {
        const unitIds = (targetAudience.targetUnits || []).map((u) => new mongoose.Types.ObjectId(u));
        if (unitIds.length === 0) return [];
        return await this.orgMembershipService.getActiveUserIds(
          orgObjectId,
          {
            $or: [{ villaId: { $in: unitIds } }, { 'units.villaId': { $in: unitIds } }],
          },
          session
        );
      }

      case AUDIENCE_TARGET_TYPES.RESIDENCY_TYPES: {
        const residencyTypes = targetAudience.targetResidencyTypes || [];
        if (residencyTypes.length === 0) return [];
        return await this.orgMembershipService.getActiveUserIds(
          orgObjectId,
          {
            $or: [
              { residentType: { $in: residencyTypes } },
              { 'units.residentType': { $in: residencyTypes } },
            ],
          },
          session
        );
      }

      case AUDIENCE_TARGET_TYPES.CUSTOM: {
        const userIds = (targetAudience.targetUsers || []).map((u) => new mongoose.Types.ObjectId(u));
        if (userIds.length === 0) return [];
        return await this.orgMembershipService.getActiveUserIds(
          orgObjectId,
          {
            userId: { $in: userIds },
          },
          session
        );
      }

      default:
        return [];
    }
  }

  /**
   * Counts the total number of eligible recipients for a targeted Notice or Poll.
   * Useful for baseline quorum and participation metrics.
   *
   * @param {Object} targetAudience - Audience targeting configuration
   * @param {string|mongoose.Types.ObjectId} orgId - Organization ID
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<number>} Total count of eligible users
   */
  async countEligibleRecipients(targetAudience, orgId, session = null) {
    try {
      const recipients = await this.resolveRecipients(targetAudience, orgId, session);
      return recipients.length;
    } catch (err) {
      logger.error('AudienceService.countEligibleRecipients error:', err.message);
      return 0;
    }
  }
}

export default new AudienceService();
