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
    // Handle overload: if second argument is a Mongoose ClientSession (object with startTransaction or id)
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
   * @param {string} unhashedToken - Raw token string
   * @param {string} [type='INVITATION'] - Token type
   * @param {import('mongoose').ClientSession} [session]
   */
  async getInvitationToken(unhashedToken, type = 'INVITATION', session = null) {
    const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
    return await tokenRepository.findOne({ token: hashedToken, type }, session);
  }

  /**
   * Validates a raw token, deletes it from the database if valid, and returns token info.
   * @param {string} unhashedToken - Raw token string
   * @param {string} type - Token type (e.g. 'INVITATION', 'RESET')
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ userId: string, orgId: string, tokenDoc: Object }>} token info
   */
  async validateAndDeleteToken(unhashedToken, type, session) {
    const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');

    const tokenDoc = await tokenRepository.findOne({ token: hashedToken, type }, session);
    if (!tokenDoc) {
      throw new HttpError(400, 'Invalid or expired invitation token.');
    }

    const userId = tokenDoc.userId;
    const orgId = tokenDoc.orgId;

    // Clean up/delete the token document from the vault
    await tokenRepository.deleteOne({ _id: tokenDoc._id }, session);

    return { userId, orgId, tokenDoc };
  }
}

export default new TokenService();
