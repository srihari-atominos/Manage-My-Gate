import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';
import { comparePassword } from '../../utils/crypto.utils.js';
import { signToken } from '../../utils/jwt.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import tokenService from '../token/token.services.js';

export class AuthService {
  /**
   * Registers a new user.
   * @param {object} registerData - Payload containing email, username, password, and roleId
   */
  async register(registerData) {
    // Resolve the role first to ensure it exists
    await roleService.getRoleById(registerData.roleId);

    // Delegate creation to user feature service
    const user = await userService.createUser(registerData);
    
    // Return sanitized user object
    return {
      id: user._id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
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

    // 3. Resolve role details via role service
    const role = await roleService.getRoleById(user.roleId);

    // 4. Retrieve and flatten permissions mapped to this role
    const permissionsList = await rolePermissionService.getPermissionsByRoleId(user.roleId);
    
    // Flatten permissions list into a string array (e.g. ['users:read', 'samples:create'])
    const permissions = permissionsList.map((permission) => permission.name);

    // 5. Generate environment-secure JWT token with embedded role and permission list
    const tokenPayload = {
      id: user._id,
      email: user.email,
      username: user.username,
      role: role.name,
      permissions,
    };

    const token = signToken(tokenPayload);

    // 6. Return response payload including token and parsed user info
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: role.name,
        permissions,
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
}

export default new AuthService();
