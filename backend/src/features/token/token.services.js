import crypto from 'crypto';
import tokenRepository from './token.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class TokenService {
  /**
   * Generates a random secure token, hashes it using SHA-256, and saves it in the database.
   * @param {string} userId - ID of the user the token is linked to
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ invitationToken: string }>} Unhashed token
   */
  async generateInvitationToken(userId, session) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await tokenRepository.create(
      {
        userId,
        token: hashedToken,
        type: 'INVITATION',
      },
      session
    );

    return { invitationToken: rawToken };
  }

  /**
   * Validates a raw token, deletes it from the database if valid, and returns the userId.
   * @param {string} unhashedToken - Raw token string
   * @param {string} type - Token type (e.g. 'INVITATION', 'RESET')
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<string>} userId associated with the token
   */
  async validateAndDeleteToken(unhashedToken, type, session) {
    const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');

    const tokenDoc = await tokenRepository.findOne({ token: hashedToken, type }, session);
    if (!tokenDoc) {
      throw new HttpError(400, 'Invalid or expired invitation token.');
    }

    const userId = tokenDoc.userId;

    // Clean up/delete the token document from the vault
    await tokenRepository.deleteOne({ _id: tokenDoc._id }, session);

    return userId;
  }
}

export default new TokenService();
