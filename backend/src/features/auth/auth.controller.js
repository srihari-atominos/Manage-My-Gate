import authService from './auth.services.js';
import config from '../../config/config.js';

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
      // Optional: Set cookie
      res.cookie('token', data.token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
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

      res.cookie('token', data.token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.success(data, 'Workspace context switched successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
