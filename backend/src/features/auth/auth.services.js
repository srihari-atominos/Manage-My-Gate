import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';
import { comparePassword } from '../../utils/crypto.utils.js';
import { signToken } from '../../utils/jwt.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import tokenService from '../token/token.services.js';
import { verifyGoogleIdToken, verifyMicrosoftIdToken } from './utils/sso.utils.js';
import config from '../../config/config.js';

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
        const activeRoleObj = roles.find(r => r.name === roleName);
        if (activeRoleObj) {
          const permissionsList = await rolePermissionService.getPermissionsByRoleId(activeRoleObj._id);
          permissions = permissionsList.map((permission) => permission.name);
        }
      } else {
        roleName = roleNames.length > 0 ? roleNames[0] : null;
        if (roleName) {
          const activeRoleObj = roles.find(r => r.name === roleName);
          if (activeRoleObj) {
            const permissionsList = await rolePermissionService.getPermissionsByRoleId(activeRoleObj._id);
            permissions = permissionsList.map((permission) => permission.name);
          }
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

    const villaInfo = selectedMembership?.villaId ? {
      id: selectedMembership.villaId._id.toString(),
      villaNumber: selectedMembership.villaId.villaNumber,
      block: selectedMembership.villaId.block,
      intercom: selectedMembership.villaId.intercom,
      occupancyStatus: selectedMembership.villaId.occupancyStatus,
    } : null;

    let visitorContext = 'None';
    if (permissions && permissions.length > 0) {
      if (permissions.includes('visitor:resident')) {
        visitorContext = 'Resident';
      } else if (permissions.includes('visitor:guard')) {
        visitorContext = 'Guard';
      } else if (permissions.includes('visitor:admin')) {
        visitorContext = 'Admin';
      }
    }

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
        visitorContext,
        villaId: villaInfo ? villaInfo.id : null,
        villaNumber: villaInfo ? villaInfo.villaNumber : '',
        villaBlock: villaInfo ? villaInfo.block : '',
        residentType: selectedMembership?.residentType || 'None',
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
        visitorContext: tokenPayload.visitorContext,
        villaId: tokenPayload.villaId,
        villaNumber: tokenPayload.villaNumber,
        villaBlock: tokenPayload.villaBlock,
        residentType: tokenPayload.residentType,
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
        visitorContext: tokenPayload.visitorContext,
        villaId: tokenPayload.villaId,
        villaNumber: tokenPayload.villaNumber,
        villaBlock: tokenPayload.villaBlock,
        residentType: tokenPayload.residentType,
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

  /**
   * Verifies Google token, finds or registers the user, and logs them in.
   * @param {string} googleToken - The Google ID token
   */
  async loginOrRegisterWithGoogle(googleToken) {
    let googlePayload;
    try {
      googlePayload = await verifyGoogleIdToken(googleToken);
    } catch (err) {
      throw new HttpError(401, `Invalid Google Token: ${err.message}`);
    }

    const { sub: googleId, email, name } = googlePayload;
    if (!email) {
      throw new HttpError(400, 'Email is required from Google profile but was not provided.');
    }

    return await this._handleSsoAuthentication({
      email: email.trim().toLowerCase(),
      name,
      provider: 'google',
      providerId: googleId,
    });
  }

  /**
   * Verifies Microsoft token, finds or registers the user, and logs them in.
   * @param {string} microsoftToken - The Microsoft ID token (JWT)
   */
  async loginOrRegisterWithMicrosoft(microsoftToken) {
    let microsoftPayload;
    try {
      microsoftPayload = await verifyMicrosoftIdToken(microsoftToken);
    } catch (err) {
      throw new HttpError(401, `Invalid Microsoft Token: ${err.message}`);
    }

    const { sub: microsoftId, email, preferred_username, name } = microsoftPayload;
    const resolvedEmail = email || preferred_username;
    if (!resolvedEmail) {
      throw new HttpError(400, 'Email is required from Microsoft profile but was not provided.');
    }

    return await this._handleSsoAuthentication({
      email: resolvedEmail.trim().toLowerCase(),
      name,
      provider: 'microsoft',
      providerId: microsoftId,
    });
  }

  /**
   * Registers a new user via SSO.
   * @private
   */
  async _registerSsoUser({ email, name, provider, providerId }, session) {
    const { v4: uuidv4 } = await import('uuid');
    const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    let derivedUsername = emailPrefix;
    if (derivedUsername.length < 3) {
      derivedUsername = 'user' + Math.floor(100 + Math.random() * 900);
    } else if (derivedUsername.length > 30) {
      derivedUsername = derivedUsername.substring(0, 30);
    }

    const randomPassword = uuidv4();
    const userData = {
      email,
      username: derivedUsername,
      password: randomPassword,
      status: 'Active',
      name: name || '',
      ssoProvider: provider,
      ssoId: providerId,
    };

    return await userService.createUser(userData, session);
  }

  /**
   * Updates an existing user's details upon successful SSO login.
   * Handles activating pending invitation users and linking SSO provider.
   * @private
   */
  async _updateExistingSsoUser(user, { provider, providerId }, session) {
    const updateData = {};
    const { v4: uuidv4 } = await import('uuid');

    if (user.status === 'Pending') {
      updateData.status = 'Active';
      if (!user.password) {
        const randomPassword = uuidv4();
        const { hashPassword } = await import('../../utils/crypto.utils.js');
        updateData.password = await hashPassword(randomPassword);
      }
    }

    if (user.ssoProvider === 'none') {
      updateData.ssoProvider = provider;
      updateData.ssoId = providerId;
    }

    if (Object.keys(updateData).length > 0) {
      return await userService.updateUser(user._id, updateData, session);
    }

    return user;
  }

  /**
   * Internal helper to find/register SSO users, activate pending invitations, and scope sessions.
   * @private
   */
  async _handleSsoAuthentication({ email, name, provider, providerId }) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find user by email
      let user = await userService.getUserByEmail(email, session);

      if (!user) {
        user = await this._registerSsoUser({ email, name, provider, providerId }, session);
      } else {
        user = await this._updateExistingSsoUser(user, { provider, providerId }, session);
      }

      await session.commitTransaction();

      // Resolve scoped token and workspaces
      const { tokenPayload, availableWorkspaces } = await this.getScopedTokenPayload(user);
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
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new AuthService();
