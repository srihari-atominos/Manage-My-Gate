import authService from './auth.services.js';
import config from '../../config/config.js';
import { setAuthCookie } from '../../utils/cookie.utils.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);
      res.success(data, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = await authService.login(req.body);
      setAuthCookie(res, data.token);
      res.success(data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await authService.getRolesForRegistration();
      res.success(roles, 'Registration roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async acceptInvite(req, res, next) {
    try {
      const { token, password } = req.body;
      await authService.acceptInvitation(token, password);
      res.success(null, 'Invitation accepted and account activated successfully');
    } catch (error) {
      next(error);
    }
  }

  async switchContext(req, res, next) {
    try {
      const { targetOrgId, targetRole } = req.body;
      const userId = req.user.id;
      const data = await authService.switchContext(userId, targetOrgId, targetRole);

      setAuthCookie(res, data.token);

      res.success(data, 'Workspace context switched successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyGoogle(req, res, next) {
    try {
      const { token } = req.body;
      const data = await authService.loginOrRegisterWithGoogle(token);
      setAuthCookie(res, data.token);
      res.success(data, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  async verifyMicrosoft(req, res, next) {
    try {
      const { token } = req.body;
      const data = await authService.loginOrRegisterWithMicrosoft(token);
      setAuthCookie(res, data.token);
      res.success(data, 'Microsoft login successful');
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
