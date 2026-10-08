import mongoose from 'mongoose';
import sessionService from './session.services.js';
import { asyncHandler } from '../../utils/asyncHandler.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import authService from '../auth/auth.services.js'; // To generate new access tokens
import { setAuthCookie, setRefreshTokenCookie } from '../../utils/cookie.utils.js';
import { signToken } from '../../utils/jwt.utils.js';

export const getUserSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const sessions = await sessionService.getUserSessions(userId);
  res.status(200).json({ success: true, sessions, data: sessions });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { sessionId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new HttpError(400, 'Invalid session ID format');
  }

  await sessionService.revokeSession(sessionId, userId);
  
  res.status(200).json({ success: true, message: 'Session revoked successfully' });
});

export const revokeAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  // If we want to keep current session alive, we'd need its ID, but usually this is called as "Logout all other devices"
  await sessionService.revokeAllUserSessions(userId);
  
  res.status(200).json({ success: true, message: 'All sessions revoked successfully' });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { targetOrgId = null, targetRole = null, targetVillaId = null } = req.body || {};
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw new HttpError(401, 'Refresh token required');
  }

  // Validate the refresh token
  const validSession = await sessionService.validateRefreshToken(token);

  // Fetch the user
  const user = await authService.getUserById(validSession.userId);

  if (!user || user.status !== 'Active') {
    throw new HttpError(401, 'User is inactive or not found');
  }

  // Rotate: every refresh token is single-use (a racing duplicate within the grace
  // window gets an access token but no new refresh token)
  const newRefreshToken = validSession.status === 'Active' ? await sessionService.rotateToken(validSession) : null;

  // Keep the community/role/unit the app is using. Membership is re-checked server-side;
  // if it is no longer active, fall back to the user's default context.
  let scoped;
  try {
    scoped = await authService.getScopedTokenPayload(user, targetOrgId, targetRole, targetVillaId);
  } catch (_) {
    scoped = await authService.getScopedTokenPayload(user);
  }
  const newAccessToken = signToken(scoped.tokenPayload);

  setAuthCookie(res, newAccessToken);
  if (newRefreshToken) setRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json({
    success: true,
    token: newAccessToken,
    ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
    data: { token: newAccessToken, ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}) },
  });
});
