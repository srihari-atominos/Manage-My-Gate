import mongoose from 'mongoose';
import userPreferenceRepository from './userPreference.repository.js';
import { SYSTEM_FEATURE_CATALOG, DEFAULT_ACTIVE_QUICK_ACTIONS } from './featureCatalog.js';
import userPreferenceEvents, { USER_PREFERENCE_UPDATED } from './userPreference.events.js';

class UserPreferenceService {
  /**
   * Get user preferences alongside system feature catalog
   * @param {string} userId 
   * @param {{ orgId?: string, villaId?: string }} [context]
   */
  async getUserPreferences(userId, context = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await userPreferenceRepository.findByUserIdAndContext(userId, context);
    
    if (!result.doc) {
      // Auto-initialize base record if missing
      await userPreferenceRepository.createDefaultPreferences(userId);
    }

    return {
      activeQuickActions: result.isCustomized ? result.activeQuickActions : null,
      isCustomized: result.isCustomized,
      featureCatalog: SYSTEM_FEATURE_CATALOG,
    };
  }

  /**
   * Update user's active quick actions using a Mongoose Transaction
   * @param {string} userId 
   * @param {string[]} activeQuickActions 
   * @param {{ orgId?: string, villaId?: string }} [context]
   */
  async updateQuickActions(userId, activeQuickActions, context = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!Array.isArray(activeQuickActions)) {
      throw new Error('activeQuickActions must be an array of string IDs');
    }

    if (activeQuickActions.length > 7) {
      throw new Error('activeQuickActions cannot exceed 7 items');
    }

    const uniqueActions = new Set(activeQuickActions);
    if (uniqueActions.size !== activeQuickActions.length) {
      throw new Error('activeQuickActions cannot contain duplicate items');
    }

    const session = await mongoose.startSession();
    let updatedPref;

    try {
      session.startTransaction();

      updatedPref = await userPreferenceRepository.upsertQuickActions(
        userId,
        activeQuickActions,
        context,
        session
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Emit application event upon successful database write
    userPreferenceEvents.emit(USER_PREFERENCE_UPDATED, {
      userId,
      orgId: context?.orgId || null,
      villaId: context?.villaId || null,
      activeQuickActions,
    });

    return {
      activeQuickActions,
      featureCatalog: SYSTEM_FEATURE_CATALOG,
    };
  }
}

export default new UserPreferenceService();
