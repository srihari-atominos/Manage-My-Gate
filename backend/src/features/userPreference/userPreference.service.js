import mongoose from 'mongoose';
import userPreferenceRepository from './userPreference.repository.js';
import { SYSTEM_FEATURE_CATALOG, DEFAULT_ACTIVE_QUICK_ACTIONS } from './featureCatalog.js';
import userPreferenceEvents, { USER_PREFERENCE_UPDATED } from './userPreference.events.js';

class UserPreferenceService {
  /**
   * Get user preferences alongside system feature catalog
   * @param {string} userId 
   */
  async getUserPreferences(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let userPref = await userPreferenceRepository.findByUserId(userId);
    
    if (!userPref || !userPref.activeQuickActions || userPref.activeQuickActions.length === 0) {
      // Auto-initialize default preferences if not present
      userPref = await userPreferenceRepository.createDefaultPreferences(userId);
    }

    return {
      activeQuickActions: userPref.activeQuickActions || DEFAULT_ACTIVE_QUICK_ACTIONS,
      featureCatalog: SYSTEM_FEATURE_CATALOG,
    };
  }

  /**
   * Update user's active quick actions using a Mongoose Transaction
   * @param {string} userId 
   * @param {string[]} activeQuickActions 
   */
  async updateQuickActions(userId, activeQuickActions) {
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
      activeQuickActions: updatedPref.activeQuickActions,
    });

    return {
      activeQuickActions: updatedPref.activeQuickActions,
      featureCatalog: SYSTEM_FEATURE_CATALOG,
    };
  }
}

export default new UserPreferenceService();
