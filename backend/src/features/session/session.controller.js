import mongoose from 'mongoose';
import sessionService from './session.services.js';
import { asyncHandler } from '../../utils/asyncHandler.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import authService from '../auth/auth.services.js';
import { setAuthCookie, setRefreshTokenCookie } from '../../utils/cookie.utils.js';

export const getUserSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const scope = req.query.scope;
  const orgId = scope === 'org' ? (req.tenant?.orgId || req.user?.orgId || req.query.orgId) : null;
  const sessions = await sessionService.getUserSessions(userId, orgId);
  res.status(200).json({ success: true, sessions, data: sessions });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { sessionId } = req.params;
  const scope = req.query.scope;
  const orgId = scope === 'org' ? (req.tenant?.orgId || req.user?.orgId || req.query.orgId) : null;
  
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new HttpError(400, 'Invalid session ID format');
  }

  await sessionService.revokeSession(sessionId, userId, orgId);
  
  res.status(200).json({ success: true, message: 'Session revoked successfully' });
});

export const revokeAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const scope = req.query.scope || (req.query.orgId ? 'org' : 'global');
  const orgId = scope === 'org' ? (req.tenant?.orgId || req.user?.orgId || req.query.orgId) : null;
  
  await sessionService.revokeAllUserSessions(userId, null, null, { scope, orgId });
  
  res.status(200).json({
    success: true,
    message: scope === 'org' ? 'Organization sessions revoked successfully' : 'All sessions revoked successfully',
    scope
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { targetOrgId = null, targetRole = null, targetVillaId = null } = req.body || {};
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new HttpError(401, 'Refresh token required');
  }

  const validSession = await sessionService.validateRefreshToken(token);
  const user = await authService.getUserById(validSession.userId);
  
  if (!user) {
    throw new HttpError(401, 'User account not found');
  }

  if (user.status === 'Pending Verification' || user.emailVerified === false) {
    throw new HttpError(403, 'Email verification required. Please verify your email before refreshing session.');
  }

  if (user.status !== 'Active') {
    throw new HttpError(403, `User account is ${user.status.toLowerCase()}.`);
  }

  // A refresh token identifies the account, not a workspace. Resolve the requested
  // workspace again from current memberships so a token cannot preserve access to a
  // community the user has since left. If that workspace is no longer valid, issue a
  // token for the user's normal active workspace instead.
  let newAccessToken;
  try {
    newAccessToken = await authService.generateToken(user, targetOrgId);
  } catch (error) {
    if (!targetOrgId || error?.statusCode !== 403) throw error;
    newAccessToken = await authService.generateToken(user);
  }

  // Rotate the refresh token after successful validation. A concurrent request that
  // arrives during the grace period receives an access token but does not create an
  // additional session.
  const newRefreshToken = await sessionService.rotateToken(validSession);
  setAuthCookie(res, newAccessToken);
  if (newRefreshToken) setRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json({
    success: true,
    token: newAccessToken,
    ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
    data: { token: newAccessToken, ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}) },
  });
});
