import authService from './auth.services.js';
import config from '../../config/config.js';
import { setAuthCookie } from '../../utils/cookie.utils.js';
import * as sessionController from '../session/session.controller.js';

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

  async validateInvite(req, res, next) {
    try {
      const token = req.query.token;
      if (!token) {
        throw new (await import('../../utils/httpError.utils.js')).default(400, 'Invitation token is required.');
      }
      const crypto = (await import('crypto')).default;
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const tokenRepository = (await import('../token/token.repository.js')).default;
      const tokenDoc = await tokenRepository.findOne({ token: hashedToken, type: 'INVITATION' });
      if (!tokenDoc) {
        throw new (await import('../../utils/httpError.utils.js')).default(400, 'Invalid or expired invitation token.');
      }

      const userService = (await import('../user/user.services.js')).default;
      const user = await userService.getUserById(tokenDoc.userId);
      if (!user) {
        throw new (await import('../../utils/httpError.utils.js')).default(404, 'Associated user not found.');
      }

      res.success(
        {
          valid: true,
          isExisting: user.status === 'Active',
          email: user.email,
          orgId: tokenDoc.orgId,
        },
        'Invitation token validated successfully'
      );
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
        res.cookie('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
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
        res.cookie('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
      }

      res.success(data, 'Invitation accepted via SSO and account activated successfully');
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

  async googleLogin(req, res, next) {
    try {
      const { token } = req.body;
      const data = await authService.loginWithGoogle(token);
      setAuthCookie(res, data.token);
      res.cookie('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
      res.success(data, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  async microsoftLogin(req, res, next) {
    try {
      const { token } = req.body;
      const data = await authService.loginWithMicrosoft(token);
      setAuthCookie(res, data.token);
      res.cookie('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
      res.success(data, 'Microsoft login successful');
    } catch (error) {
      next(error);
    }
  }

  async initiatePhoneLogin(req, res, next) {
    try {
      const { phone } = req.body;
      const data = await authService.initiatePhoneLogin(phone);
      res.success(data, 'OTP sent to phone');
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
      res.cookie('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
      res.success(data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async initiateEmailOtpLogin(req, res, next) {
    try {
      const { email } = req.body;
      const data = await authService.initiateEmailOtpLogin(email);
      res.success(data, 'OTP sent to email');
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
      res.cookie('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
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
      const otpService = (await import('../otp/otp.services.js')).default;
      await otpService.verifyOTP(identifier, code, 'RESET', null, false);
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
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      res.success(null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
