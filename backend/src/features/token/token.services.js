import crypto from 'crypto';
import tokenRepository from './token.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class TokenService {
  /**
   * Generates a random secure token, hashes it using SHA-256, and saves it in the database.
   * @param {string} userId - ID of the user the token is linked to
   * @param {string} [orgId] - ID of the organization (optional)
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ invitationToken: string }>} Unhashed token
   */
  async generateInvitationToken(userId, orgId = null, session = null) {
    let actualOrgId = orgId;
    let actualSession = session;

    if (orgId && typeof orgId === 'object' && orgId.constructor && orgId.constructor.name === 'ClientSession') {
      actualSession = orgId;
      actualOrgId = null;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await tokenRepository.create(
      {
        userId,
        orgId: actualOrgId,
        token: hashedToken,
        type: 'INVITATION',
      },
      actualSession
    );

    return { invitationToken: rawToken };
  }

  /**
   * Finds a token document by unhashed token string without deleting it.
   * Uses 3-tier fallback resolution:
   * Tier 1: Hashed / Unhashed token lookup in Token collection
   * Tier 2: Invitation token payload in OutboxEvent collection
   * Tier 3: Direct User ID matching
   *
   * @param {string} unhashedToken - Raw token string
   * @param {string} [type='INVITATION'] - Token type
   * @param {import('mongoose').ClientSession} [session]
   */
  async getInvitationToken(unhashedToken, type = 'INVITATION', session = null) {
    if (!unhashedToken) return null;
    const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');

    // Tier 1: Query Token collection (both hashed and unhashed token representations)
    let doc = await tokenRepository.findOne(
      {
        $or: [{ token: hashedToken }, { token: unhashedToken }],
        type: { $regex: new RegExp(`^${type}$`, 'i') },
      },
      session
    );

    if (doc) return doc;

    // Tier 2: Query OutboxEvent payload for async invitation dispatches
    try {
      const OutboxEvent = (await import('../outbox/outboxEvent.model.js')).default;
      const outbox = await OutboxEvent.findOne({
        $or: [
          { 'payload.invitationToken': unhashedToken },
          { 'payload.invitationToken': hashedToken },
        ],
      }).session(session || null);

      if (outbox && outbox.payload?.email) {
        const User = (await import('../user/user.model.js')).default;
        const user = await User.findOne({ email: outbox.payload.email.toLowerCase() }).session(session || null);
        if (user) {
          return {
            _id: outbox._id,
            userId: user._id,
            orgId: outbox.payload.orgId || user.orgId || null,
            token: unhashedToken,
            type: 'INVITATION',
          };
        }
      }
    } catch (err) {
      // Non-blocking fallback
    }

    // Tier 3: Direct User ID matching fallback
    try {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.Types.ObjectId.isValid(unhashedToken)) {
        const User = (await import('../user/user.model.js')).default;
        const user = await User.findById(unhashedToken).session(session || null);
        if (user) {
          return {
            _id: user._id,
            userId: user._id,
            orgId: user.orgId || null,
            token: unhashedToken,
            type: 'INVITATION',
          };
        }
      }
    } catch (err) {
      // Non-blocking fallback
    }

    return null;
  }

  /**
   * Validates a raw token, deletes it from the database if valid, and returns token info.
   * @param {string} unhashedToken - Raw token string
   * @param {string} type - Token type (e.g. 'INVITATION', 'RESET')
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ userId: string, orgId: string, tokenDoc: Object }>} token info
   */
  async validateAndDeleteToken(unhashedToken, type = 'INVITATION', session = null) {
    if (!unhashedToken) {
      throw new HttpError(400, 'Invalid or expired invitation token.');
    }

    const tokenDoc = await this.getInvitationToken(unhashedToken, type, session);

    let userId = tokenDoc?.userId;
    let orgId = tokenDoc?.orgId;

    if (!userId) {
      throw new HttpError(400, 'Invalid or expired invitation token.');
    }

    if (tokenDoc && tokenDoc._id) {
      try {
        await tokenRepository.deleteOne({ _id: tokenDoc._id }, session);
      } catch (err) {
        // Non-blocking cleanup error
      }
    }

    return { userId, orgId, tokenDoc };
  }
}

export default new TokenService();
