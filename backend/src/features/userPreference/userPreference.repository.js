import UserPreference from './userPreference.model.js';
import { DEFAULT_ACTIVE_QUICK_ACTIONS } from './featureCatalog.js';

class UserPreferenceRepository {
  /**
   * Find user preferences by userId
   * @param {string} userId 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async findByUserId(userId, session = null) {
    const query = UserPreference.findOne({ userId });
    if (session) {
      query.session(session);
    }
    return await query.exec();
  }

  /**
   * Upsert activeQuickActions array for a user
   * @param {string} userId 
   * @param {string[]} activeQuickActions 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async upsertQuickActions(userId, activeQuickActions, session = null) {
    const options = {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    };
    if (session) {
      options.session = session;
    }

    return await UserPreference.findOneAndUpdate(
      { userId },
      { $set: { activeQuickActions } },
      options
    ).exec();
  }

  /**
   * Create default preferences for a new user if missing
   * @param {string} userId 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async createDefaultPreferences(userId, session = null) {
    return await this.upsertQuickActions(userId, DEFAULT_ACTIVE_QUICK_ACTIONS, session);
  }
}

export default new UserPreferenceRepository();
