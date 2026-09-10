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
   * Finds a token document by its ID.
   * @param {string|mongoose.Types.ObjectId} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async findById(id, session) {
    return await Token.findById(id).session(session || null);
  }

  /**
   * Finds multiple token documents matching query.
   * @param {Object} query
   * @param {import('mongoose').ClientSession} [session]
   */
  async find(query, session) {
    return await Token.find(query).session(session || null);
  }

  /**
   * Finds and updates a single token document atomically.
   * @param {Object} query
   * @param {Object} update
   * @param {Object} [options={}]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findOneAndUpdate(query, update, options = {}, session = null) {
    return await Token.findOneAndUpdate(query, update, { returnDocument: 'after', ...options }).session(session || null);
  }

  /**
   * Updates multiple token documents matching query.
   * @param {Object} query
   * @param {Object} update
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateMany(query, update, session = null) {
    return await Token.updateMany(query, update).session(session || null);
  }

  /**
   * Deletes multiple token documents matching query.
   * @param {Object} query
   * @param {import('mongoose').ClientSession} [session]
   */
  async deleteMany(query, session) {
    return await Token.deleteMany(query, session ? { session } : undefined);
  }

  /**
   * Runs an aggregation pipeline on the Token collection.
   * @param {Array<Object>} pipeline
   * @param {import('mongoose').ClientSession} [session]
   */
  async aggregate(pipeline, session = null) {
    return await Token.aggregate(pipeline).session(session || null);
  }
}

export default new TokenRepository();

