import authService from './auth.services.js';
import config from '../../config/config.js';
import { setAuthCookie, setRefreshTokenCookie, clearAuthCookie } from '../../utils/cookie.utils.js';
import * as sessionController from '../session/session.controller.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);
      res.success(data, data?.message || 'User registered successfully, pending verification', 201);
    } catch (error) {
      console.error('[AuthController.register] Error:', error);
      next(error);
    }
  }

  async verifyRegistrationOtp(req, res, next) {
    try {
      const { email, code } = req.body;
      const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
      const data = await authService.verifyRegistrationOtp(email, code, deviceInfo);
      setAuthCookie(res, data.token);
      res.success(data, 'Account verified and activated successfully');
    } catch (error) {
      console.error('[AuthController.verifyRegistrationOtp] Error:', error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = await authService.login(req.body);
      setAuthCookie(res, data.token);
      if (data.refreshToken) {
        setRefreshTokenCookie(res, data.refreshToken);
      }
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

  async validateInvite(req, res, next) {
    try {
      const token = req.query.token;
      const data = await authService.validateInvite(token);
      res.success(data, 'Invitation token validated successfully');
    } catch (error) {
      next(error);
    }
  }

  async acceptInvite(req, res, next) {
    try {
      const { token, password } = req.body;
      const data = await authService.acceptInvitation(token, password);
      
      if (data && data.token) {
        setAuthCookie(res, data.token);
      }
      if (data && data.refreshToken) {
        setRefreshTokenCookie(res, data.refreshToken);
      }

      res.success(data, 'Invitation accepted and account activated successfully');
    } catch (error) {
      next(error);
    }
  }

  async acceptInviteWithSSO(req, res, next) {
    try {
      const { inviteToken, ssoCredential, provider } = req.body;
      const data = await authService.acceptInvitationWithSSO(inviteToken, ssoCredential, provider);
      
      if (data && data.token) {
        setAuthCookie(res, data.token);
      }
      if (data && data.refreshToken) {
        setRefreshTokenCookie(res, data.refreshToken);
      }

      res.success(data, 'Invitation accepted via SSO and account activated successfully');
    } catch (error) {
      next(error);
    }
  }

  async registerSsoWithOrg(req, res, next) {
    try {
      const payload = req.body;
      const data = await authService.registerSsoWithOrg(payload);
      
      if (data && data.token) {
        setAuthCookie(res, data.token);
      }
      if (data && data.refreshToken) {
        setRefreshTokenCookie(res, data.refreshToken);
      }

      res.success(data, 'SSO Registration and Organization setup successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async switchContext(req, res, next) {
    try {
      const { targetOrgId, targetVillaId, targetRole } = req.body;
      const userId = req.user.id;
      const data = await authService.switchContext(userId, targetOrgId, targetVillaId, targetRole);

      setAuthCookie(res, data.token);

      res.success(data, 'Workspace context switched successfully');
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req, res, next) {
    try {
      const { token, inviteToken, isRegister } = req.body;
      const data = await authService.loginWithGoogle(token, inviteToken, isRegister);
      
      if (data.isNewUser) {
        return res.success(data, 'Google token verified. User not found.', 200);
      }

      setAuthCookie(res, data.token);
      if (data.refreshToken) {
        setRefreshTokenCookie(res, data.refreshToken);
      }
      res.success(data, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  async microsoftLogin(req, res, next) {
    try {
      const { token, inviteToken } = req.body;
      const data = await authService.loginWithMicrosoft(token, inviteToken);
      setAuthCookie(res, data.token);
      setRefreshTokenCookie(res, data.refreshToken);
      res.success(data, 'Microsoft login successful');
    } catch (error) {
      next(error);
    }
  }

  async initiatePhoneLogin(req, res, next) {
    try {
      const { phone } = req.body;
      const data = await authService.initiatePhoneLogin(phone);
      res.success(data, data?.message || 'OTP sent to phone');
    } catch (error) {
      next(error);
    }
  }

  async verifyPhoneLogin(req, res, next) {
    try {
      const { phone, code } = req.body;
      const deviceInfo = {
        deviceName: req.headers['user-agent'],
        browser: 'Browser',
        os: 'OS',
        ipAddress: req.ip,
      };
      const data = await authService.verifyPhoneLogin(phone, code, deviceInfo);
      setAuthCookie(res, data.token);
      setRefreshTokenCookie(res, data.refreshToken);
      res.success(data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async initiateEmailOtpLogin(req, res, next) {
    try {
      const { email } = req.body;
      const data = await authService.initiateEmailOtpLogin(email);
      res.success(data, data?.message || 'OTP sent to email');
    } catch (error) {
      next(error);
    }
  }

  async verifyEmailOtpLogin(req, res, next) {
    try {
      const { email, code } = req.body;
      const deviceInfo = {
        deviceName: req.headers['user-agent'],
        browser: 'Browser',
        os: 'OS',
        ipAddress: req.ip,
      };
      const data = await authService.verifyEmailOtpLogin(email, code, deviceInfo);
      setAuthCookie(res, data.token);
      setRefreshTokenCookie(res, data.refreshToken);
      res.success(data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { identifier } = req.body;
      const data = await authService.forgotPassword(identifier);
      res.success(data, 'Password reset OTP sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { identifier, code, newPassword } = req.body;
      await authService.resetPassword(identifier, code, newPassword);
      res.success(null, 'Password has been reset successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyResetPasswordOtp(req, res, next) {
    try {
      const { identifier, code } = req.body;
      await authService.verifyResetPasswordOtp(identifier, code);
      res.success(null, 'OTP verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    return sessionController.refreshToken(req, res, next);
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const userId = req.user?._id || req.user?.id;
      if (userId) {
        await authService.logout(userId, token);
      }
      clearAuthCookie(res);
      res.success(null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async setupAccountPassword(req, res, next) {
    try {
      const { email, password, orgName } = req.body;
      const deviceInfo = {
        deviceName: req.headers['user-agent'],
        browser: 'Browser',
        os: 'OS',
        ipAddress: req.ip,
      };
      const data = await authService.setupAccountPassword(email, password, deviceInfo, orgName);
      res.success(data, 'Password configured successfully. Account activated.');
    } catch (error) {
      next(error);
    }
  }

  async checkAccountStatus(req, res, next) {
    try {
      const { email } = req.query;
      const data = await authService.checkAccountStatus(email);
      res.success(data, 'Account status fetched successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
