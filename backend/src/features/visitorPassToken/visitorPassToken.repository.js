import VisitorPassToken from './visitorPassToken.model.js';

export class VisitorPassTokenRepository {
  /**
   * Create a new VisitorPassToken.
   * @param {Object} data - The data to create the token mapping.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The created token mapping document.
   */
  async create(data, session = null) {
    const token = new VisitorPassToken(data);
    return await token.save(session ? { session } : undefined);
  }

  /**
   * Find a VisitorPassToken by its passCode (prefixed key).
   * @param {string} passCode - The prefixed code string.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The token mapping document, or null if not found.
   */
  async findByCode(code, session = null) {
    return await VisitorPassToken.findOne({
      $or: [{ passCode: code }, { shortKey: code }],
    }).session(session || null);
  }

  /**
   * Find a VisitorPassToken by its passId.
   * @param {string} passId - The visitor pass ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The token mapping document, or null if not found.
   */
  async findByPassId(passId, session = null) {
    return await VisitorPassToken.findOne({ passId }).session(session || null);
  }

  /**
   * Delete a VisitorPassToken mapping by its passId.
   * @param {string} passId - The visitor pass ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The deleted result.
   */
  async deleteByPassId(passId, session = null) {
    return await VisitorPassToken.deleteOne({ passId }, session ? { session } : undefined);
  }
}

export default new VisitorPassTokenRepository();
