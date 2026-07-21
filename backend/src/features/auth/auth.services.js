import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';
import { comparePassword } from '../../utils/crypto.utils.js';
import { signToken } from '../../utils/jwt.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import tokenService from '../token/token.services.js';
import otpService from '../otp/otp.services.js';
import sessionService from '../session/session.services.js';
import userIdentityService from '../userIdentity/userIdentity.services.js';
import config from '../../config/config.js';
import authEvents from './auth.events.js';

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
      const { email, username, password, phone } = registerData;

      // 1. Dynamically import services to adhere to encapsulation and prevent circular dependency
      const userService = (await import('../user/user.services.js')).default;

      // 2. Create the User (passing session)
      const newUser = await userService.createUser({ email, username, password, phone, status: 'Active' }, session);

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
      villaNumber: selectedMembership.villaId.unitNumber,
      block: selectedMembership.villaId.blockOrBuilding,
      intercom: selectedMembership.villaId.intercom,
      occupancyStatus: selectedMembership.villaId.status,
    } : null;

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

    // 5. Create session & Refresh Token
    const deviceInfo = loginData.deviceInfo || {};
    const refreshToken = await sessionService.createSession(user._id, deviceInfo);

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

      // Check if user exists and is Pending Verification
      const user = await userService.getUserById(userId, session);
      if (user.status !== 'Pending Verification') {
        throw new HttpError(400, 'User is already active or inactive.');
      }

      const { hashPassword } = await import('../../utils/crypto.utils.js');
      const hashedPassword = await hashPassword(password);

      // Perform user activation via user service
      await userService.activateUser(userId, hashedPassword, session);

      await session.commitTransaction();

      // Auto-login logic
      const { tokenPayload, availableWorkspaces } = await this.getScopedTokenPayload(user);
      const token = signToken(tokenPayload);
      const refreshToken = await sessionService.createSession(user._id, {});

      return {
        token,
        refreshToken,
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
  async loginWithGoogle(googleToken) {
    const identityData = await userIdentityService.verifyAndNormalizeProviderToken('google', googleToken);
    return await this._handleSsoAuthentication(identityData);
  }

  /**
   * Verifies Microsoft token, finds or registers the user, and logs them in.
   * @param {string} microsoftToken - The Microsoft ID token (JWT)
   */
  async loginWithMicrosoft(microsoftToken) {
    const identityData = await userIdentityService.verifyAndNormalizeProviderToken('microsoft', microsoftToken);
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
    const { providerEmail: email, provider, providerId } = identityData;
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Check if identity exists
      let existingIdentity = await userIdentityService.getIdentityByProviderId(provider, providerId, session);
      let user = null;

      if (existingIdentity) {
        // Find existing user linked to identity
        user = await userService.getUserById(existingIdentity.userId, session);
        if (!user || user.status !== 'Active') {
          throw new HttpError(403, 'Account is inactive or suspended.');
        }
      } else {
        // Fallback: Check if user exists by email to link them
        user = await userService.getUserByEmail(email, session);
      }

      if (!user) {
        user = await this._registerSsoUser(identityData, session);
      } else {
        user = await this._updateExistingSsoUser(user, identityData, session);
      }

      await session.commitTransaction();

      // Resolve scoped token and workspaces
      const { tokenPayload, availableWorkspaces } = await this.getScopedTokenPayload(user);
      const token = signToken(tokenPayload);
      const refreshToken = await sessionService.createSession(user._id, {}); // device info should ideally come from client
      
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
          permissions: tokenPayload.permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
          visitorContext: tokenPayload.visitorContext,
        },
        availableWorkspaces,
      };
    } catch (error) {
      authEvents.emit('LOGIN_FAILED', { email: email, reason: error.message, method: provider });
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
  async initiatePhoneLogin(phone) {
    // 1. Fetch user by phone
    const userService = (await import('../user/user.services.js')).default;
    const mongoose = (await import('mongoose')).default;
    const User = (await import('../user/user.model.js')).default;
    
    const trimmedPhone = phone.trim();
    const basePhone = trimmedPhone.replace(/^\+\d+\s*/, '');

    const orConditions = [{ phone: trimmedPhone }];
    if (basePhone) {
      orConditions.push({ phone: basePhone });
    }

    const user = await User.findOne({ $or: orConditions });
    if (!user) {
      throw new HttpError(404, 'No account found with this phone number.');
    }

    // 2. Check for Firebase Integration
    const IntegrationHub = (await import('../integrationHub/integrationHub.model.js')).default;
    const firebaseIntegration = await IntegrationHub.findOne({ provider: 'firebase', status: 'connected' });

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

    // 3. Emit event for SMS delivery
    authEvents.emit('OTP_SENT', { identifier: phone, code: plainCode, type: 'SMS' });

    return { message: 'OTP sent successfully' };
  }

  async verifyPhoneLogin(phone, code, deviceInfo) {
    const User = (await import('../user/user.model.js')).default;
    
    // 1. Verify OTP
    const otpResult = await otpService.verifyOTP(phone, code, 'LOGIN');

    if (otpResult && otpResult.sessionInfo) {
      // This was a Firebase managed OTP
      const IntegrationHub = (await import('../integrationHub/integrationHub.model.js')).default;
      const firebaseIntegration = await IntegrationHub.findOne({ provider: 'firebase', status: 'connected' });
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
    const trimmedPhone = phone.trim();
    const basePhone = trimmedPhone.replace(/^\+\d+\s*/, '');

    const orConditions = [{ phone: trimmedPhone }];
    if (basePhone) {
      orConditions.push({ phone: basePhone });
    }

    const user = await User.findOne({ $or: orConditions });
    if (!user) {
      throw new HttpError(404, 'User not found.');
    }

    if (user.status !== 'Active') {
      throw new HttpError(403, `Account is ${user.status}`);
    }

    // Mark phone as verified if not already
    if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }

    // 3. Generate tokens
    const { tokenPayload, availableWorkspaces } = await this.getScopedTokenPayload(user);
    const token = signToken(tokenPayload);
    const refreshToken = await sessionService.createSession(user._id, deviceInfo);

    return {
      token,
      refreshToken,
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
  }

  async initiateEmailOtpLogin(email) {
    const userService = (await import('../user/user.services.js')).default;
    const user = await userService.getUserByEmail(email);
    
    if (!user) {
      throw new HttpError(404, 'No account found with this email.');
    }

    const plainCode = await otpService.createOTP(email, 'LOGIN');
    authEvents.emit('OTP_SENT', { identifier: email, code: plainCode, type: 'EMAIL' });

    return { message: 'OTP sent successfully' };
  }

  async verifyEmailOtpLogin(email, code, deviceInfo) {
    const userService = (await import('../user/user.services.js')).default;
    
    await otpService.verifyOTP(email, code, 'LOGIN');

    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new HttpError(404, 'User not found.');
    }

    if (user.status !== 'Active') {
      throw new HttpError(403, `Account is ${user.status}`);
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const { tokenPayload, availableWorkspaces } = await this.getScopedTokenPayload(user);
    const token = signToken(tokenPayload);
    const refreshToken = await sessionService.createSession(user._id, deviceInfo);

    return {
      token,
      refreshToken,
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
  }

  async forgotPassword(identifier) {
    const User = (await import('../user/user.model.js')).default;
    const trimmedIdentifier = identifier.trim();
    const basePhone = trimmedIdentifier.replace(/^\+\d+\s*/, '');

    const orConditions = [
      { email: trimmedIdentifier.toLowerCase() }, 
      { phone: trimmedIdentifier }
    ];
    if (basePhone) {
      orConditions.push({ phone: basePhone });
    }

    const user = await User.findOne({ $or: orConditions });

    if (!user) {
      throw new HttpError(404, 'No account found with this identifier.');
    }

    const type = identifier.includes('@') ? 'EMAIL' : 'SMS';
    const plainCode = await otpService.createOTP(identifier, 'RESET');
    
    authEvents.emit('OTP_SENT', { identifier, code: plainCode, type });

    return { message: 'Password reset OTP sent' };
  }

  async resetPassword(identifier, code, newPassword) {
    const User = (await import('../user/user.model.js')).default;
    
    await otpService.verifyOTP(identifier, code, 'RESET');

    const trimmedIdentifier = identifier.trim();
    const basePhone = trimmedIdentifier.replace(/^\+\d+\s*/, '');

    const orConditions = [
      { email: trimmedIdentifier.toLowerCase() }, 
      { phone: trimmedIdentifier }
    ];
    if (basePhone) {
      orConditions.push({ phone: basePhone });
    }

    const user = await User.findOne({ $or: orConditions });

    if (!user) {
      throw new HttpError(404, 'User not found.');
    }

    const { hashPassword } = await import('../../utils/crypto.utils.js');
    user.password = await hashPassword(newPassword);
    
    // Auto-verify if they successfully reset password via OTP
    if (identifier.includes('@')) {
      user.emailVerified = true;
    } else {
      user.phoneVerified = true;
    }

    await user.save();

    // Revoke all existing sessions to enforce security after password reset
    await sessionService.revokeAllUserSessions(user._id);
    
    authEvents.emit('PASSWORD_RESET', { userId: user._id });

    return true;
  }

  async logout(userId, refreshTokenStr) {
    if (refreshTokenStr) {
      const { verifyRefreshToken } = await import('../../utils/jwt.utils.js');
      const { comparePassword } = await import('../../utils/crypto.utils.js');
      const Session = (await import('../session/session.model.js')).default;

      try {
        const payload = verifyRefreshToken(refreshTokenStr);
        const sessions = await Session.find({ userId, status: 'Active' });
        
        for (const sessionDoc of sessions) {
          if (await comparePassword(payload.jti, sessionDoc.refreshToken)) {
            sessionDoc.status = 'Revoked';
            await sessionDoc.save();
            break;
          }
        }
      } catch (err) {
        // Ignore token errors during logout
      }
    }
  }
}

export default new AuthService();
