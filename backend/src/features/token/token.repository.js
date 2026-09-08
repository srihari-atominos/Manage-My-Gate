import Token from './token.model.js';

export class TokenRepository {
  /**
   * Creates a new token document.
   * @param {Object} tokenData - userId, token, type
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(tokenData, session) {
    const token = new Token(tokenData);
    return await token.save(session ? { session } : undefined);
  }

  /**
   * Finds a single token document.
   * @param {Object} query
   * @param {import('mongoose').ClientSession} [session]
   */
  async findOne(query, session) {
    return await Token.findOne(query).session(session || null);
  }

  /**
   * Deletes a single token document.
   * @param {Object} query
   * @param {import('mongoose').ClientSession} [session]
   */
  async deleteOne(query, session) {
    return await Token.deleteOne(query).session(session || null);
  }

  /**
   * Updates a single token document.
   * @param {Object} query
   * @param {Object} update
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateOne(query, update, session) {
    return await Token.updateOne(query, update).session(session || null);
  }

  /**
   * Deletes multiple token documents matching query.
   * @param {Object} query
   * @param {import('mongoose').ClientSession} [session]
   */
  async deleteMany(query, session) {
    return await Token.deleteMany(query, session ? { session } : undefined);
  }
}

export default new TokenRepository();
