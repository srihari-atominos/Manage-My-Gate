import Session from './session.model.js';
import { hashPassword, comparePassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import { signRefreshToken, verifyRefreshToken } from '../../utils/jwt.utils.js';
import crypto from 'crypto';
import config from '../../config/config.js';
import authEvents from '../auth/auth.events.js';

/** How long a just-rotated refresh token is still honoured (concurrent refresh requests). */
export const ROTATION_GRACE_SECONDS = 30;

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

    // Active sessions, plus ones rotated moments ago (two refreshes racing with the same token)
    const graceStart = new Date(Date.now() - ROTATION_GRACE_SECONDS * 1000);
    const sessions = await Session.find({
      userId,
      $or: [{ status: 'Active' }, { status: 'Rotated', rotatedAt: { $gte: graceStart } }],
    });

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
   * Rotates the refresh token: the current session is marked Rotated (still accepted
   * for a few seconds so a concurrent refresh doesn't log the user out) and a new
   * session with the same device details is created.
   * @returns {Promise<string|null>} the new refresh token, or null if another request already rotated it
   */
  async rotateToken(sessionDoc) {
    const marked = await Session.updateOne(
      { _id: sessionDoc._id, status: 'Active' },
      { status: 'Rotated', rotatedAt: new Date() }
    );
    if (marked.modifiedCount === 0) return null;
    return await this.createSession(sessionDoc.userId, {
      deviceName: sessionDoc.deviceName,
      browser: sessionDoc.browser,
      os: sessionDoc.os,
      ipAddress: sessionDoc.ipAddress,
    });
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
  async revokeAllUserSessions(userId, exceptSessionId = null, session = null) {
    const query = { userId, status: 'Active' };
    if (exceptSessionId) {
      query._id = { $ne: exceptSessionId };
    }
    await Session.updateMany(query, { status: 'Revoked' }).session(session || null);
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

  /**
   * Revoke session based on refresh token.
   * @param {string} userId - User identifier
   * @param {string} refreshTokenStr - Refresh token JWT string
   * @param {import('mongoose').ClientSession} [session] - Optional session
   */
  async revokeSessionByToken(userId, refreshTokenStr, session = null) {
    try {
      const payload = verifyRefreshToken(refreshTokenStr);
      const sessions = await Session.find({ userId, status: 'Active' }).session(session || null);
      
      for (const sessionDoc of sessions) {
        if (await comparePassword(payload.jti, sessionDoc.refreshToken)) {
          sessionDoc.status = 'Revoked';
          await sessionDoc.save(session ? { session } : undefined);
          authEvents.emit('SESSION_REVOKED', { userId, sessionId: sessionDoc._id });
          break;
        }
      }
    } catch (err) {
      // Ignore token errors during logout/revocation
    }
  }
}

export default new SessionService();
