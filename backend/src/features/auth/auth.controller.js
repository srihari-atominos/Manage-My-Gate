import authService from './auth.services.js';

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
        secure: process.env.NODE_ENV === 'production',
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
}

export default new AuthController();
