import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';
import { comparePassword } from '../../utils/crypto.utils.js';
import { signToken, verifyToken } from '../../utils/jwt.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import tokenService from '../token/token.services.js';
import otpService from '../otp/otp.services.js';
import sessionService from '../session/session.services.js';
import userIdentityService from '../userIdentity/userIdentity.services.js';
import integrationHubService from '../integrationHub/integrationHub.service.js';
import config from '../../config/config.js';
import authEvents from './auth.events.js';
import userEvents from '../user/user.events.js';
import emailValidator from 'deep-email-validator';

export class AuthService {
  /**
   * Deep Email Verification using MX and SMTP checks
   * Blocks disposable emails and verifies mailbox existence.
   * @param {string} email - The email address to verify
   */
  async verifyEmailDeep(email) {
    const res = await emailValidator({
      email: email,
      validateRegex: true,
      validateMx: true,
      validateTypo: false,
      validateDisposable: true,
      validateSMTP: true,
    });
    
    if (!res.valid) {
      throw new HttpError(400, 'This email address does not appear to exist or cannot receive mail.');
    }
  }
  /**
   * Registers a new user with standard credentials.
   * Decoupled from organization setup.
   * @param {object} registerData - Payload containing email, username, and password
   */
  async register(registerData) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    
    // --- TRANSACTION BOUNDARY START ---
    // Wrap the user creation process in a transaction to ensure database consistency.
    session.startTransaction();

    try {
      const { email, password, phone } = registerData;

      // Deep Email Verification before registration
      if (email) {
        await this.verifyEmailDeep(email);
      }

      // Extract name from registerData
      let nameToUse = registerData.name || (registerData.firstName || registerData.lastName ? `${registerData.firstName || ''} ${registerData.lastName || ''}`.trim() : '');
      nameToUse = nameToUse.trim();

      // Derive username: prioritize name, fallback to email prefix
      let derivedUsername;
      if (nameToUse) {
        derivedUsername = nameToUse.replace(/[^a-zA-Z0-9]/g, '');
      } else if (registerData.username) {
        derivedUsername = registerData.username.replace(/[^a-zA-Z0-9]/g, '');
      } else {
        derivedUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      }

      // Ensure length bounds
      if (derivedUsername.length < 3) {
        derivedUsername = 'user' + Math.floor(100 + Math.random() * 900);
      } else if (derivedUsername.length > 30) {
        derivedUsername = derivedUsername.substring(0, 30);
      }

      // Check if username exists, and generate a unique one if so
      let usernameExists = await userService.getUserByEmailOrUsername(derivedUsername, session).catch(() => null);
      let uniqueUsername = derivedUsername;
      while (usernameExists) {
        const suffix = Math.floor(1000 + Math.random() * 9000).toString();
        uniqueUsername = derivedUsername;
        if (uniqueUsername.length + suffix.length > 30) {
          uniqueUsername = uniqueUsername.substring(0, 30 - suffix.length);
        }
        uniqueUsername = `${uniqueUsername}${suffix}`;
        usernameExists = await userService.getUserByEmailOrUsername(uniqueUsername, session).catch(() => null);
      }

      // Create the User (passing session for transactional execution)
      const newUser = await userService.createUser(
        { email, username: uniqueUsername, password, phone, name: nameToUse || undefined, status: 'Active' },
        session
      );

      await session.commitTransaction();
      // --- TRANSACTION BOUNDARY END ---

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

      // Emit internal event on successful user registration/auth write
      authEvents.emit('USER_CREATED', { userId: newUser._id, provider: 'local' });
      authEvents.emit('LOGIN_SUCCESS', { userId: newUser._id, method: 'local_register' });

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
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Helper to fetch active user memberships and construct the token payload and available workspaces.
   * @param {object} user - User document
   * @param {string} [targetOrgId=null] - Optional target organization ID to scope the context to
   * @returns {Promise<{tokenPayload: object, availableWorkspaces: Array}>}
   */
  async getScopedTokenPayload(user, targetOrgId = null, targetRole = null, targetVillaId = null) {
    const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
    const memberships = await orgMembershipService.getUserMemberships(user._id);

    // Active memberships only (where organization status is Active and membership status is Active or missing for legacy documents)
    const activeMemberships = memberships.filter((m) => m.orgId && m.orgId.status === 'Active' && (m.status === 'Active' || !m.status));

    let selectedMembership = null;
    const targetOrgIdStr = targetOrgId ? targetOrgId.toString() : null;

    if (targetOrgIdStr) {
      if (targetVillaId) {
        const targetVillaIdStr = targetVillaId.toString();
        selectedMembership = activeMemberships.find((m) => 
          m.orgId._id.toString() === targetOrgIdStr && 
          m.villaId && 
          (m.villaId._id ? m.villaId._id.toString() === targetVillaIdStr : m.villaId.toString() === targetVillaIdStr)
        );
      }
      // Fallback to first membership in org if no specific villa requested or found
      if (!selectedMembership) {
        selectedMembership = activeMemberships.find((m) => m.orgId._id.toString() === targetOrgIdStr);
      }
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
    let activeRoleObj = null;

    if (selectedMembership) {
      orgId = selectedMembership.orgId._id.toString();
      isPlatform = selectedMembership.orgId.isPlatform || false;

      const roles = [];
      if (selectedMembership.roleIds && selectedMembership.roleIds.length > 0) {
        roles.push(...selectedMembership.roleIds.filter(Boolean));
      } else if (selectedMembership.roleId) {
        roles.push(selectedMembership.roleId);
      }

      const roleNames = roles.map(r => r?.name).filter(Boolean);

      if (targetRole) {
        if (!roleNames.includes(targetRole)) {
          throw new HttpError(400, `User does not have role '${targetRole}' in this organization.`);
        }
        roleName = targetRole;
        activeRoleObj = roles.find(r => r?.name === roleName);
        if (activeRoleObj) {
          const permissionsList = await rolePermissionService.getPermissionsByRoleId(activeRoleObj._id);
          permissions = permissionsList.map((permission) => permission.name);
        }
      } else {
        roleName = roleNames.length > 0 ? roleNames[0] : null;
        if (roleName) {
          activeRoleObj = roles.find(r => r?.name === roleName);
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
        roles.push(...m.roleIds.filter(Boolean));
      } else if (m.roleId) {
        roles.push(m.roleId);
      }
      const validRoles = roles.filter(Boolean);
      return {
        orgId: m.orgId._id.toString(),
        name: m.orgId.name,
        isPlatform: m.orgId.isPlatform || false,
        roleName: validRoles.map(r => r.name).join(', ') || null,
        roles: validRoles.map(r => r.name),
        villaId: m.villaId ? (m.villaId._id ? m.villaId._id.toString() : m.villaId.toString()) : null,
        villaNumber: m.villaId?.unitNumber || null,
        residentType: m.residentType || 'None',
      };
    });

    // Resolve primary unit (fallback to units[0] or the root villaId)
    let primaryUnit = null;
    if (selectedMembership) {
      if (selectedMembership.units && selectedMembership.units.length > 0) {
        primaryUnit = selectedMembership.units[0];
      } else if (selectedMembership.villaId) {
        primaryUnit = {
          villaId: selectedMembership.villaId,
          residentType: selectedMembership.residentType || 'None'
        };
      }
    }

    const villaInfo = primaryUnit?.villaId ? {
      id: primaryUnit.villaId._id ? primaryUnit.villaId._id.toString() : primaryUnit.villaId.toString(),
      villaNumber: primaryUnit.villaId.unitNumber || '',
      block: primaryUnit.villaId.blockOrBuilding || '',
      intercom: primaryUnit.villaId.intercom || '',
      occupancyStatus: primaryUnit.villaId.status || '',
      residentType: primaryUnit.residentType || 'None',
    } : null;

    const accessibleUnits = [];
    if (selectedMembership) {
      if (selectedMembership.units && selectedMembership.units.length > 0) {
        for (const unit of selectedMembership.units) {
          if (unit.villaId) {
            accessibleUnits.push({
              villaId: unit.villaId._id ? unit.villaId._id.toString() : unit.villaId.toString(),
              villaNumber: unit.villaId.unitNumber || '',
              block: unit.villaId.blockOrBuilding || '',
              residentType: unit.residentType || 'None'
            });
          }
        }
      } else if (selectedMembership.villaId) {
        accessibleUnits.push({
          villaId: selectedMembership.villaId._id ? selectedMembership.villaId._id.toString() : selectedMembership.villaId.toString(),
          villaNumber: selectedMembership.villaId.unitNumber || '',
          block: selectedMembership.villaId.blockOrBuilding || '',
          residentType: selectedMembership.residentType || 'None'
        });
      }
    }

    let visitorContext = 'None';
    if (permissions && permissions.length > 0) {
      if (permissions.includes('visitor:admin')) {
        visitorContext = 'Admin';
      } else if (permissions.includes('visitor:guard')) {
        visitorContext = 'Guard';
      } else if (permissions.includes('visitor:resident')) {
        visitorContext = 'Resident';
      }
    }

    return {
      tokenPayload: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: roleName,
        roleId: activeRoleObj ? activeRoleObj._id.toString() : null,
        roles: selectedMembership ? (selectedMembership.roleIds && selectedMembership.roleIds.length > 0 ? selectedMembership.roleIds.map(r => r.name) : (selectedMembership.roleId ? [selectedMembership.roleId.name] : [])) : [],
        orgId,
        isPlatform,
        visitorContext,
        villaId: villaInfo ? villaInfo.id : null,
        villaNumber: villaInfo ? villaInfo.villaNumber : '',
        villaBlock: villaInfo ? villaInfo.block : '',
        residentType: villaInfo ? villaInfo.residentType : (selectedMembership?.residentType || 'None'),
        accessibleUnits,
      },
      permissions,
      availableWorkspaces,
    };
  }

  /**
   * Authenticates user and generates a token with flattened permission scopes.
   * @param {object} loginData - Payload containing login (email/username) and password
   */
  async login(loginData) {
    const { login, password, inviteToken } = loginData;

    // Deep Email Verification before login (if identifier is formatted as an email)
    if (login && login.includes('@')) {
      await this.verifyEmailDeep(login);
    }

    // 1. Fetch user by email or username
    const user = await userService.getUserByEmailOrUsername(login);
    if (!user) {
      throw new HttpError(401, 'Invalid credentials. User not found.');
    }

    if (user.status === 'Suspended' || user.status === 'Blocked') {
      throw new HttpError(403, `Your account has been ${user.status.toLowerCase()}. Please contact support.`);
    }

    if (user.status === 'Pending Verification' && !inviteToken) {
      throw new HttpError(403, 'Your account is pending verification. Please accept your workspace invitation first.');
    }

    if (!user.password) {
      throw new HttpError(401, 'Invalid credentials. Password is not set for this account.');
    }

    // 2. Verify password with bcrypt compare
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid credentials. Incorrect password.');
    }

    // 2b. Process invitation token if provided during login
    let targetOrgIdFromInvite = null;
    if (inviteToken) {
      try {
        const { orgId } = await tokenService.validateAndDeleteToken(inviteToken, 'INVITATION');
        targetOrgIdFromInvite = orgId;
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        await orgMembershipService.updateStatus(user._id, orgId, 'Active');
      } catch (tokenError) {
        if (user.status === 'Pending Verification') {
          throw tokenError;
        }
        console.warn('Login processed with invalid or expired invite token for active user:', tokenError.message);
      }
    }

    // 3. Resolve context and available workspaces
    const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user, targetOrgIdFromInvite);

    // 4. Generate JWT token
    const token = signToken(tokenPayload);

    // 5. Create session & Refresh Token
    const deviceInfo = loginData.deviceInfo || {};
    const refreshToken = await sessionService.createSession(user._id, deviceInfo);

    // Emit event for successful login write operation
    authEvents.emit('LOGIN_SUCCESS', { userId: user._id, method: 'credentials' });

    // 6. Return response payload matching new structure
    return {
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: tokenPayload.role,
        roles: tokenPayload.roles,
        permissions: permissions,
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
  async switchContext(userId, targetOrgId, targetVillaId = null, targetRole = null) {
    // Fetch user details for the token payload
    const user = await userService.getUserById(userId);

    // Resolve context for the target organization
    const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user, targetOrgId, targetRole, targetVillaId);

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
        permissions: permissions,
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
    
    // --- TRANSACTION BOUNDARY START ---
    // Encapsulate invitation validation, deletion, and activation in a single database transaction.
    session.startTransaction();
    try {
      // Use the standalone token service to validate and consume the token
      const { userId, orgId } = await tokenService.validateAndDeleteToken(rawToken, 'INVITATION', session);

      // Check if user exists and is Pending Verification
      const user = await userService.getUserById(userId, session);
      if (user.status !== 'Pending Verification') {
        throw new HttpError(400, 'User is already active or inactive.');
      }

      const { hashPassword } = await import('../../utils/crypto.utils.js');
      const hashedPassword = await hashPassword(password);

      // Perform user activation via user service
      await userService.activateUser(userId, hashedPassword, session);

      // Update OrgMembership status to Active for this organization
      if (orgId) {
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        await orgMembershipService.updateStatus(userId, orgId, 'Active', session);
      }

      // Auto-login session creation (inside transaction for atomic flow validation)
      const refreshToken = await sessionService.createSession(user._id, {}, session);

      await session.commitTransaction();
      // --- TRANSACTION BOUNDARY END ---

      // Auto-login logic (read scopes are done outside transaction block)
      const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user);
      const token = signToken(tokenPayload);

      // Emit event for successful activation and login write operations
      authEvents.emit('USER_ACTIVATED', { userId: user._id });
      userEvents.emit('USER_ACTIVATED', { userId: user._id, orgId });
      userEvents.emit('USER_UPDATED', { userId: user._id, orgId, action: 'activated' });
      authEvents.emit('LOGIN_SUCCESS', { userId: user._id, method: 'invitation' });

      return {
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          permissions: permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
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
   * Verifies Google token, finds the user, and returns conditional response.
   * @param {string} googleToken - The Google ID token
   * @param {string} [inviteToken=null] - Optional invitation token
   */
  async loginWithGoogle(googleToken, inviteToken = null) {
    const identityData = await userIdentityService.verifyAndNormalizeProviderToken('google', googleToken);
    if (inviteToken) {
      identityData.inviteToken = inviteToken;
    }
    
    const { providerEmail: email, profileData, provider, providerId } = identityData;
    const name = profileData?.name || '';
    
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      let existingIdentity = await userIdentityService.getIdentityByProviderId(provider, providerId, session);
      let user = null;

      if (existingIdentity) {
        try {
          user = await userService.getUserById(existingIdentity.userId, session);
        } catch (err) {
          if (err.statusCode === 404) {
            user = null;
          } else {
            throw err;
          }
        }
        
        if (user && user.status !== 'Active' && user.status !== 'Pending Verification' && user.status !== 'Pending') {
          throw new HttpError(403, 'Account is inactive or suspended.');
        }
      } 
      
      if (!user) {
        user = await userService.getUserByEmail(email, session);
      }

      if (!user) {
        // New User Flow
        await session.commitTransaction();
        return {
          isNewUser: true,
          googleData: { email, name }
        };
      }

      // Existing User Flow
      user = await this._updateExistingSsoUser(user, identityData, session);

      let targetOrgIdFromInvite = null;
      if (inviteToken) {
        try {
          const { orgId } = await tokenService.validateAndDeleteToken(inviteToken, 'INVITATION', session);
          targetOrgIdFromInvite = orgId;
          const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
          await orgMembershipService.updateStatus(user._id, orgId, 'Active', session);
        } catch (tokenError) {
          if (user.status === 'Pending Verification') {
            throw tokenError;
          }
          console.warn('SSO login processed with invalid or expired invite token for active user:', tokenError.message);
        }
      }

      const refreshToken = await sessionService.createSession(user._id, {}, session);
      await session.commitTransaction();

      const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user, targetOrgIdFromInvite);
      const token = signToken(tokenPayload);
      
      authEvents.emit('PROVIDER_LOGIN', { userId: user._id, provider });
      authEvents.emit('LOGIN_SUCCESS', { userId: user._id, method: provider });

      return {
        isNewUser: false,
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          permissions: permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      authEvents.emit('LOGIN_FAILED', { email: email, reason: error.message, method: provider });
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Verifies Microsoft token, finds or registers the user, and logs them in.
   * @param {string} microsoftToken - The Microsoft ID token (JWT)
   * @param {string} [inviteToken=null] - Optional invitation token
   */
  async loginWithMicrosoft(microsoftToken, inviteToken = null) {
    const identityData = await userIdentityService.verifyAndNormalizeProviderToken('microsoft', microsoftToken);
    if (inviteToken) {
      identityData.inviteToken = inviteToken;
    }
    return await this._handleSsoAuthentication(identityData);
  }

  /**
   * Registers a new user via SSO.
   * @private
   */
  async _registerSsoUser(identityData, session) {
    const { providerEmail: email, profileData, provider, providerId } = identityData;
    const name = profileData?.name || '';
    
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
      name: name,
      emailVerified: true, // SSO emails are pre-verified
    };

    const newUser = await userService.createUser(userData, session);
    
    // Assign default role logic could go here if handled by user.services, but tenant context handles most roles.
    // Ensure identity is linked securely
    await userIdentityService.linkIdentity(newUser._id, identityData, session);
    
    authEvents.emit('USER_CREATED', { userId: newUser._id, provider });
    return newUser;
  }

  /**
   * Updates an existing user's details upon successful SSO login.
   * Handles activating pending invitation users and linking SSO provider.
   * @private
   */
  async _updateExistingSsoUser(user, identityData, session) {
    const { provider, providerId, providerEmail } = identityData;
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

    if (!user.emailVerified && user.email === providerEmail) {
      updateData.emailVerified = true;
    }

    const existingIdentity = await userIdentityService.getIdentityByProviderId(provider, providerId, session);
    if (!existingIdentity) {
      await userIdentityService.linkIdentity(user._id, identityData, session);
      authEvents.emit('USER_LINKED_PROVIDER', { userId: user._id, provider });
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
  async _handleSsoAuthentication(identityData) {
    const { providerEmail: email, provider, providerId, inviteToken } = identityData;
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Check if identity exists
      let existingIdentity = await userIdentityService.getIdentityByProviderId(provider, providerId, session);
      let user = null;

      if (existingIdentity) {
        // Find existing user linked to identity
        try {
          user = await userService.getUserById(existingIdentity.userId, session);
        } catch (err) {
          if (err.statusCode === 404) {
            user = null; // Dangling identity
          } else {
            throw err;
          }
        }
        
        if (user && user.status !== 'Active') {
          throw new HttpError(403, 'Account is inactive or suspended.');
        }
      } 
      
      if (!user) {
        // Fallback: Check if user exists by email to link them
        user = await userService.getUserByEmail(email, session);
      }

      if (!user) {
        user = await this._registerSsoUser(identityData, session);
      } else {
        user = await this._updateExistingSsoUser(user, identityData, session);
      }

      // Process invitation token if provided during SSO login
      let targetOrgIdFromInvite = null;
      if (inviteToken) {
        try {
          const { orgId } = await tokenService.validateAndDeleteToken(inviteToken, 'INVITATION', session);
          targetOrgIdFromInvite = orgId;
          const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
          await orgMembershipService.updateStatus(user._id, orgId, 'Active', session);
        } catch (tokenError) {
          if (user.status === 'Pending Verification') {
            throw tokenError;
          }
          console.warn('SSO login processed with invalid or expired invite token for active user:', tokenError.message);
        }
      }

      const refreshToken = await sessionService.createSession(user._id, {}, session);
      await session.commitTransaction();

      // Resolve scoped token and workspaces
      const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user, targetOrgIdFromInvite);
      const token = signToken(tokenPayload);
      
      authEvents.emit('PROVIDER_LOGIN', { userId: user._id, provider });
      authEvents.emit('LOGIN_SUCCESS', { userId: user._id, method: provider });

      return {
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          permissions: permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      authEvents.emit('LOGIN_FAILED', { email: email, reason: error.message, method: provider });
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Initiates the phone login process by verifying user existence and sending local/Firebase OTP.
   * @param {string} phone - User phone number
   */
  async initiatePhoneLogin(phone) {
    const normalizedPhone = phone ? phone.replace(/\s+/g, '') : '';
    const user = await userService.getUserByPhone(normalizedPhone);
    if (!user) {
      throw new HttpError(404, 'This phone number is not registered. Please sign up first.');
    }

    // Check for Firebase Integration globally
    const firebaseIntegration = await integrationHubService.getGlobalConnectionByProvider('firebase');

    if (firebaseIntegration) {
      // Proxy request to Google Identity Toolkit
      const { decrypt } = await import('../integrationHub/utils/crypto.util.js');
      const apiKeyCred = firebaseIntegration.credentials.find(c => c.key === 'apiKey');
      if (apiKeyCred) {
        const apiKey = decrypt(apiKeyCred.encryptedValue, apiKeyCred.iv);
        
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone.trim() }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new HttpError(400, `Firebase SMS Failed: ${responseData.error?.message || response.statusText}`);
        }

        const sessionInfo = responseData.sessionInfo;
        
        // Save the sessionInfo in OTP service to verify later
        await otpService.createOTP(phone, 'LOGIN', 5, null, sessionInfo);
        
        return { message: 'OTP sent via Firebase successfully' };
      }
    }

    // Fallback: Generate local OTP
    const plainCode = await otpService.createOTP(phone, 'LOGIN');

    // Emit event for SMS delivery
    authEvents.emit('OTP_SENT', { identifier: phone, code: plainCode, type: 'SMS' });

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verifies the phone login OTP and generates JWT tokens.
   * @param {string} phone - User phone number
   * @param {string} code - OTP verification code
   * @param {object} deviceInfo - Client device meta
   */
  async verifyPhoneLogin(phone, code, deviceInfo) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    
    // --- TRANSACTION BOUNDARY START ---
    // Encapsulate OTP validation (via external Firebase if needed) and session registration.
    session.startTransaction();

    try {
      // 1. Verify OTP
      const otpResult = await otpService.verifyOTP(phone, code, 'LOGIN');

      if (otpResult && otpResult.sessionInfo) {
        // This was a Firebase managed OTP
        const firebaseIntegration = await integrationHubService.getGlobalConnectionByProvider('firebase', session);
        if (!firebaseIntegration) throw new HttpError(400, 'Firebase configuration missing.');
        
        const { decrypt } = await import('../integrationHub/utils/crypto.util.js');
        const apiKeyCred = firebaseIntegration.credentials.find(c => c.key === 'apiKey');
        const apiKey = decrypt(apiKeyCred.encryptedValue, apiKeyCred.iv);

        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionInfo: otpResult.sessionInfo, code }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          throw new HttpError(400, `Firebase Verification Failed: ${responseData.error?.message || response.statusText}`);
        }
      }

      // 2. Fetch user
      const user = await userService.getUserByPhone(phone, session);
      if (!user) {
        throw new HttpError(404, 'User not found.');
      }

      if (user.status !== 'Active') {
        throw new HttpError(403, `Account is ${user.status}`);
      }

      // Mark phone as verified if not already
      if (!user.phoneVerified) {
        await userService.updateUser(user._id, { phoneVerified: true }, session);
      }

      // 3. Generate session refresh token
      const refreshToken = await sessionService.createSession(user._id, deviceInfo, session);

      await session.commitTransaction();
      // --- TRANSACTION BOUNDARY END ---

      // Scoped token and available workspaces resolved outside the transaction context
      const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user);
      const token = signToken(tokenPayload);

      // Emit event on successful login
      authEvents.emit('LOGIN_SUCCESS', { userId: user._id, method: 'phone' });

      return {
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          permissions: permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Initiates the email login process by checking user existence and sending OTP.
   * @param {string} email - User email address
   */
  async initiateEmailOtpLogin(email) {
    const user = await userService.getUserByEmail(email);
    
    if (!user) {
      throw new HttpError(404, 'No account found with this email.');
    }

    const plainCode = await otpService.createOTP(email, 'LOGIN');
    authEvents.emit('OTP_SENT', { identifier: email, code: plainCode, type: 'EMAIL' });

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verifies the email login OTP and registers session.
   * @param {string} email - User email address
   * @param {string} code - OTP verification code
   * @param {object} deviceInfo - Client device meta
   */
  async verifyEmailOtpLogin(email, code, deviceInfo) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    
    // --- TRANSACTION BOUNDARY START ---
    // Encapsulate email OTP validation, user activation verification, and session setup.
    session.startTransaction();

    try {
      await otpService.verifyOTP(email, code, 'LOGIN');

      const user = await userService.getUserByEmail(email, session);
      if (!user) {
        throw new HttpError(404, 'User not found.');
      }

      if (user.status !== 'Active') {
        throw new HttpError(403, `Account is ${user.status}`);
      }

      if (!user.emailVerified) {
        await userService.updateUser(user._id, { emailVerified: true }, session);
      }

      const refreshToken = await sessionService.createSession(user._id, deviceInfo, session);

      await session.commitTransaction();
      // --- TRANSACTION BOUNDARY END ---

      const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user);
      const token = signToken(tokenPayload);

      // Emit event on successful login
      authEvents.emit('LOGIN_SUCCESS', { userId: user._id, method: 'email_otp' });

      return {
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          permissions: permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Initiates password recovery process by generating a verification OTP.
   * @param {string} identifier - User email or phone number
   */
  async forgotPassword(identifier) {
    const user = await userService.getUserByEmailOrPhone(identifier);

    if (!user) {
      throw new HttpError(404, 'No account found with this identifier.');
    }

    const type = identifier.includes('@') ? 'EMAIL' : 'SMS';
    const plainCode = await otpService.createOTP(identifier, 'RESET');
    
    authEvents.emit('OTP_SENT', { identifier, code: plainCode, type });

    return { message: 'Password reset OTP sent' };
  }

  /**
   * Confirms password reset using valid OTP and revokes previous sessions for security.
   * @param {string} identifier - User email or phone
   * @param {string} code - OTP verification code
   * @param {string} newPassword - Selected new password
   */
  async resetPassword(identifier, code, newPassword) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    
    // --- TRANSACTION BOUNDARY START ---
    // Enforce atomic password updates, verification checks, and session cleanup.
    session.startTransaction();

    try {
      await otpService.verifyOTP(identifier, code, 'RESET');

      const user = await userService.getUserByEmailOrPhone(identifier, session);
      if (!user) {
        throw new HttpError(404, 'User not found.');
      }

      const { hashPassword } = await import('../../utils/crypto.utils.js');
      const hashedPassword = await hashPassword(newPassword);
      
      const updateData = { password: hashedPassword };
      if (identifier.includes('@')) {
        updateData.emailVerified = true;
      } else {
        updateData.phoneVerified = true;
      }

      await userService.updateUser(user._id, updateData, session);

      // Revoke all existing sessions to enforce security after password reset
      await sessionService.revokeAllUserSessions(user._id, null, session);

      await session.commitTransaction();
      // --- TRANSACTION BOUNDARY END ---

      // Emit event for successful password update
      authEvents.emit('PASSWORD_RESET', { userId: user._id });

      return true;
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Standard logout, revokes active session.
   * @param {string} userId - User identifier
   * @param {string} refreshTokenStr - Refresh token JWT string
   */
  async logout(userId, refreshTokenStr) {
    if (refreshTokenStr) {
      // Delegate session revocation to the session service to preserve domain encapsulation
      await sessionService.revokeSessionByToken(userId, refreshTokenStr);
    }
  }

  /**
   * Accepts a workspace invitation using SSO (Google or Microsoft).
   * @param {string} inviteToken - Decodable JWT invitation token containing user context
   * @param {string} ssoCredential - Provider credential token (ID token)
   * @param {string} provider - SSO Provider ('google' or 'microsoft')
   */
  async acceptInvitationWithSSO(inviteToken, ssoCredential, provider) {
    // 1. Verify SSO token using provider adapters through UserIdentityService
    const identityData = await userIdentityService.verifyAndNormalizeProviderToken(provider, ssoCredential);
    const ssoEmail = identityData.providerEmail;

    // 2. Database transaction for atomic operations
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    
    // --- TRANSACTION BOUNDARY START ---
    // Wrap activation, identity linkage, and session registration in an atomic transaction.
    session.startTransaction();

    try {
      // Validate and consume the invitation token in the database
      const { userId, orgId } = await tokenService.validateAndDeleteToken(inviteToken, 'INVITATION', session);

      // Fetch user to ensure they exist and status is Pending Verification
      const user = await userService.getUserById(userId, session);
      if (user.status !== 'Pending Verification') {
        throw new HttpError(400, 'User is already active or inactive.');
      }

      if (!user.email || ssoEmail.toLowerCase() !== user.email.toLowerCase()) {
        throw new HttpError(403, 'Email in SSO token does not match the invitation email.');
      }

      // Generate a random password, hash it, and activate user
      const { v4: uuidv4 } = await import('uuid');
      const { hashPassword } = await import('../../utils/crypto.utils.js');
      const randomPassword = uuidv4();
      const hashedPassword = await hashPassword(randomPassword);

      // Call userService.activateUser to activate user and set password
      const activatedUser = await userService.activateUser(userId, hashedPassword, session);

      // Update OrgMembership status to Active for this organization
      if (orgId) {
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        await orgMembershipService.updateStatus(userId, orgId, 'Active', session);
      }

      // Call userIdentityService.createIdentity to link SSO identity
      if (typeof userIdentityService.createIdentity === 'function') {
        await userIdentityService.createIdentity(userId, identityData, session);
      } else {
        await userIdentityService.linkIdentity(userId, identityData, session);
      }

      // Call sessionService.createSession to create active login session
      const refreshToken = await sessionService.createSession(userId, {}, session);

      await session.commitTransaction();
      // --- TRANSACTION BOUNDARY END ---

      // Resolve scoped token and workspaces (outside transaction)
      const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(activatedUser);
      const token = signToken(tokenPayload);

      // Emit events for successful login/auth write operations
      authEvents.emit('PROVIDER_LOGIN', { userId: activatedUser._id, provider });
      authEvents.emit('LOGIN_SUCCESS', { userId: activatedUser._id, method: provider });
      authEvents.emit('USER_ACTIVATED', { userId: activatedUser._id });
      userEvents.emit('USER_ACTIVATED', { userId: activatedUser._id, orgId });
      userEvents.emit('USER_UPDATED', { userId: activatedUser._id, orgId, action: 'activated' });

      return {
        token,
        refreshToken,
        user: {
          id: activatedUser._id,
          email: activatedUser.email,
          username: activatedUser.username,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          permissions: permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  async validateInvite(token) {
    if (!token) {
      throw new HttpError(400, 'Invitation token is required.');
    }
    const tokenDoc = await tokenService.getInvitationToken(token, 'INVITATION');
    if (!tokenDoc) {
      throw new HttpError(400, 'Invalid or expired invitation token.');
    }

    const user = await userService.getUserById(tokenDoc.userId);
    if (!user) {
      throw new HttpError(404, 'Associated user not found.');
    }

    return {
      valid: true,
      isExisting: user.status === 'Active',
      email: user.email,
      orgId: tokenDoc.orgId,
    };
  }

  async verifyResetPasswordOtp(identifier, code) {
    return await otpService.verifyOTP(identifier, code, 'RESET', null, false);
  }
}

export default new AuthService();
