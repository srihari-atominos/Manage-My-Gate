import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';
import { comparePassword } from '../../utils/crypto.utils.js';
import { signToken } from '../../utils/jwt.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import tokenService from '../token/token.services.js';

export class AuthService {
  /**
   * Registers a new user with standard credentials.
   * Decoupled from organization setup.
   * @param {object} registerData - Payload containing email, username, and password
   */
  async register(registerData) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { email, username, password } = registerData;

      // 1. Dynamically import services to adhere to encapsulation and prevent circular dependency
      const userService = (await import('../user/user.services.js')).default;

      // 2. Create the User (passing session)
      const newUser = await userService.createUser({ email, username, password, status: 'Active' }, session);

      await session.commitTransaction();

      // Return standard user/token payload with null/empty tenant context
      const tokenPayload = {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        role: null,
        permissions: [],
        orgId: null,
        isPlatform: false,
      };

      const token = signToken(tokenPayload);

      return {
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          role: null,
          permissions: [],
          orgId: null,
          isPlatform: false,
          organizations: [],
        },
        availableWorkspaces: [],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Helper to fetch active user memberships and construct the token payload and available workspaces.
   * @param {object} user - User document
   * @param {string} [targetOrgId=null] - Optional target organization ID to scope the context to
   * @returns {Promise<{tokenPayload: object, availableWorkspaces: Array}>}
   */
  async getScopedTokenPayload(user, targetOrgId = null, targetRole = null) {
    const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
    const memberships = await orgMembershipService.getUserMemberships(user._id);

    // Active memberships only (where organization status is Active)
    const activeMemberships = memberships.filter((m) => m.orgId && m.orgId.status === 'Active');

    let selectedMembership = null;

    if (targetOrgId) {
      selectedMembership = activeMemberships.find((m) => m.orgId._id.toString() === targetOrgId);
      if (!selectedMembership) {
        throw new HttpError(403, 'Access denied. You do not have an active membership in this workspace.');
      }
    } else {
      // Primary context selection:
      // 1. Try to find the platform workspace
      selectedMembership = activeMemberships.find((m) => m.orgId.isPlatform === true);
      // 2. Fall back to the first active workspace
      if (!selectedMembership && activeMemberships.length > 0) {
        selectedMembership = activeMemberships[0];
      }
    }

    let roleName = null;
    let permissions = [];
    let orgId = null;
    let isPlatform = false;

    if (selectedMembership) {
      orgId = selectedMembership.orgId._id.toString();
      isPlatform = selectedMembership.orgId.isPlatform || false;

      const roles = [];
      if (selectedMembership.roleIds && selectedMembership.roleIds.length > 0) {
        roles.push(...selectedMembership.roleIds);
      } else if (selectedMembership.roleId) {
        roles.push(selectedMembership.roleId);
      }

      const roleNames = roles.map(r => r.name);

      if (targetRole) {
        if (!roleNames.includes(targetRole)) {
          throw new HttpError(400, `User does not have role '${targetRole}' in this organization.`);
        }
        roleName = targetRole;
      } else {
        roleName = roleNames.length > 0 ? roleNames[0] : null;
      }

      if (roleName) {
        const activeRoleObj = roles.find(r => r.name === roleName);
        if (activeRoleObj) {
          const permissionsList = await rolePermissionService.getPermissionsByRoleId(activeRoleObj._id);
          permissions = permissionsList.map((permission) => permission.name);
        }
      }
    }

    const availableWorkspaces = activeMemberships.map((m) => {
      const roles = [];
      if (m.roleIds && m.roleIds.length > 0) {
        roles.push(...m.roleIds);
      } else if (m.roleId) {
        roles.push(m.roleId);
      }
      return {
        orgId: m.orgId._id.toString(),
        name: m.orgId.name,
        isPlatform: m.orgId.isPlatform || false,
        roleName: roles.map(r => r.name).join(', ') || null,
      };
    });

    return {
      tokenPayload: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: roleName,
        roles: selectedMembership ? (selectedMembership.roleIds && selectedMembership.roleIds.length > 0 ? selectedMembership.roleIds.map(r => r.name) : (selectedMembership.roleId ? [selectedMembership.roleId.name] : [])) : [],
        permissions,
        orgId,
        isPlatform,
      },
      availableWorkspaces,
    };
  }

  /**
   * Authenticates user and generates a token with flattened permission scopes.
   * @param {object} loginData - Payload containing login (email/username) and password
   */
  async login(loginData) {
    const { login, password } = loginData;

    // 1. Fetch user by email or username
    const user = await userService.getUserByEmailOrUsername(login);
    if (!user) {
      throw new HttpError(401, 'Invalid credentials. User not found.');
    }

    // 2. Verify password with bcrypt compare
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid credentials. Incorrect password.');
    }

    // 3. Resolve context and available workspaces
    const { tokenPayload, availableWorkspaces } = await this.getScopedTokenPayload(user);

    // 4. Generate JWT token
    const token = signToken(tokenPayload);

    // 5. Return response payload matching new structure
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: tokenPayload.role,
        roles: tokenPayload.roles,
        permissions: tokenPayload.permissions,
        orgId: tokenPayload.orgId,
        isPlatform: tokenPayload.isPlatform,
      },
      availableWorkspaces,
    };
  }

  /**
   * Switches the active workspace context for the user and returns a newly scoped token.
   * @param {string} userId - User ID
   * @param {string} targetOrgId - Target organization ID
   */
  async switchContext(userId, targetOrgId, targetRole = null) {
    // Fetch user details for the token payload
    const user = await userService.getUserById(userId);

    // Resolve context for the target organization
    const { tokenPayload } = await this.getScopedTokenPayload(user, targetOrgId, targetRole);

    // Generate fresh JWT token
    const token = signToken(tokenPayload);

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: tokenPayload.role,
        roles: tokenPayload.roles,
        permissions: tokenPayload.permissions,
        orgId: tokenPayload.orgId,
        isPlatform: tokenPayload.isPlatform,
      },
    };
  }

  /**
   * Retrieves all roles for registration purposes.
   */
  async getRolesForRegistration() {
    return await roleService.getAllRoles();
  }

  /**
   * Finds the invitation token, updates the user password/status, and cleans up the token.
   * @param {string} rawToken - Unhashed token from client
   * @param {string} password - New password set by user
   */
  async acceptInvitation(rawToken, password) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Use the standalone token service to validate and consume the token
      const userId = await tokenService.validateAndDeleteToken(rawToken, 'INVITATION', session);

      // Check if user exists and is Pending
      const user = await userService.getUserById(userId, session);
      if (user.status !== 'Pending') {
        throw new HttpError(400, 'User is already active or inactive.');
      }

      const { hashPassword } = await import('../../utils/crypto.utils.js');
      const hashedPassword = await hashPassword(password);

      // Perform user activation via user service
      await userService.activateUser(userId, hashedPassword, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getUserById(id, session) {
    return await userService.getUserById(id, session);
  }

  /**
   * Generates a token for a user, dynamically selecting the primary context.
   * @param {object} user - User document
   * @param {string} [targetOrgId=null] - Optional target organization ID to scope the token to
   */
  async generateToken(user, targetOrgId = null) {
    const { tokenPayload } = await this.getScopedTokenPayload(user, targetOrgId);
    return signToken(tokenPayload);
  }
}

export default new AuthService();
