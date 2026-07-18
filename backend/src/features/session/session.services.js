import Session from './session.model.js';
import { hashPassword, comparePassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import { signRefreshToken, verifyRefreshToken } from '../../utils/jwt.utils.js';
import crypto from 'crypto';
import config from '../../config/config.js';
import authEvents from '../auth/auth.events.js';

export class SessionService {
  /**
   * Creates a new session and generates a refresh token.
   */
  async createSession(userId, deviceInfo, session = null) {
    // Generate a random token string payload
    const plainToken = crypto.randomBytes(40).toString('hex');
    
    // Sign it as a JWT refresh token
    const refreshToken = signRefreshToken({ id: userId, jti: plainToken });
    
    // Hash the plain random part before saving to DB
    const hashedToken = await hashPassword(plainToken);

    // Calculate expiry (e.g. 7 days from now) based on config
    const days = parseInt(config.jwt.refreshExpiresIn) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const newSession = new Session({
      userId,
      refreshToken: hashedToken,
      deviceName: deviceInfo.deviceName || 'Unknown Device',
      browser: deviceInfo.browser || 'Unknown Browser',
      os: deviceInfo.os || 'Unknown OS',
      ipAddress: deviceInfo.ipAddress,
      expiresAt,
    });

    await newSession.save({ session });

    authEvents.emit('SESSION_CREATED', { userId, sessionId: newSession._id, deviceName: newSession.deviceName });

    return refreshToken;
  }

  /**
   * Validates a refresh token and returns the session if valid.
   */
  async validateRefreshToken(refreshTokenStr) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenStr);
    } catch (error) {
      throw new HttpError(401, 'Invalid or expired refresh token');
    }

    const { id: userId, jti: plainToken } = payload;

    // Find active sessions for this user
    const sessions = await Session.find({ userId, status: 'Active' });

    let validSession = null;
    for (const sessionDoc of sessions) {
      const isMatch = await comparePassword(plainToken, sessionDoc.refreshToken);
      if (isMatch) {
        validSession = sessionDoc;
        break;
      }
    }

    if (!validSession) {
      throw new HttpError(401, 'Session not found or revoked');
    }

    // Update last activity
    validSession.lastActivity = new Date();
    await validSession.save();

    return validSession;
  }

  /**
   * Rotates the refresh token (revokes current, creates new).
   */
  async rotateToken(sessionId, userId, deviceInfo) {
    await Session.updateOne({ _id: sessionId }, { status: 'Revoked' });
    authEvents.emit('SESSION_REVOKED', { userId, sessionId });
    return await this.createSession(userId, deviceInfo);
  }

  /**
   * Revokes a specific session.
   */
  async revokeSession(sessionId, userId) {
    const result = await Session.updateOne(
      { _id: sessionId, userId },
      { status: 'Revoked' }
    );
    if (result.matchedCount === 0) {
      throw new HttpError(404, 'Session not found');
    }
    authEvents.emit('SESSION_REVOKED', { userId, sessionId });
  }

  /**
   * Revokes all active sessions for a user, except optionally the current one.
   */
  async revokeAllUserSessions(userId, exceptSessionId = null) {
    const query = { userId, status: 'Active' };
    if (exceptSessionId) {
      query._id = { $ne: exceptSessionId };
    }
    await Session.updateMany(query, { status: 'Revoked' });
    authEvents.emit('SESSION_REVOKED', { userId, multiple: true });
  }

  /**
   * Gets all active sessions for a user.
   */
  async getUserSessions(userId) {
    return await Session.find({ userId, status: 'Active' })
      .select('-refreshToken')
      .sort({ lastActivity: -1 });
  }
}

export default new SessionService();
