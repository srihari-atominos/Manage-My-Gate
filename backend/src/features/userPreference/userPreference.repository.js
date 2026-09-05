import UserPreference from './userPreference.model.js';
import { DEFAULT_ACTIVE_QUICK_ACTIONS } from './featureCatalog.js';

class UserPreferenceRepository {
  /**
   * Find user preferences by userId
   * @param {string} userId 
   * @param {import('mongoose').ClientSession} [session] 
   */
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
   * Find user preferences by userId and context (orgId, villaId)
   * @param {string} userId 
   * @param {{ orgId?: string, villaId?: string }} [context] 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async findByUserIdAndContext(userId, context = {}, session = null) {
    const doc = await this.findByUserId(userId, session);
    const orgId = context?.orgId ? String(context.orgId).trim() : '';
    const villaId = context?.villaId ? String(context.villaId).trim() : '';

    if (!doc) {
      return { activeQuickActions: null, isCustomized: false, doc: null };
    }

    // If context is specified, check scopedPreferences
    if (orgId || villaId) {
      const scopedList = Array.isArray(doc.scopedPreferences) ? doc.scopedPreferences : [];
      
      // 1. Exact match for both orgId and villaId
      const exactMatch = scopedList.find(
        (sp) => (sp.orgId || '') === orgId && (sp.villaId || '') === villaId
      );
      if (exactMatch && Array.isArray(exactMatch.activeQuickActions) && exactMatch.activeQuickActions.length > 0) {
        return {
          activeQuickActions: exactMatch.activeQuickActions,
          isCustomized: true,
          doc,
        };
      }

      // 2. Org-level match if villaId has no specific override
      if (villaId && orgId) {
        const orgMatch = scopedList.find(
          (sp) => (sp.orgId || '') === orgId && (!sp.villaId || sp.villaId === '')
        );
        if (orgMatch && Array.isArray(orgMatch.activeQuickActions) && orgMatch.activeQuickActions.length > 0) {
          return {
            activeQuickActions: orgMatch.activeQuickActions,
            isCustomized: true,
            doc,
          };
        }
      }

      // Context specified but not yet customized for this specific villa/org
      return {
        activeQuickActions: null,
        isCustomized: false,
        doc,
      };
    }

    // Global / fallback context
    return {
      activeQuickActions: doc.activeQuickActions || DEFAULT_ACTIVE_QUICK_ACTIONS,
      isCustomized: Boolean(doc.activeQuickActions && doc.activeQuickActions.length > 0),
      doc,
    };
  }

  /**
   * Upsert activeQuickActions array for a user with optional workspace context
   * @param {string} userId 
   * @param {string[]} activeQuickActions 
   * @param {{ orgId?: string, villaId?: string }} [context] 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async upsertQuickActions(userId, activeQuickActions, context = {}, session = null) {
    const orgId = context?.orgId ? String(context.orgId).trim() : '';
    const villaId = context?.villaId ? String(context.villaId).trim() : '';

    let doc = await this.findByUserId(userId, session);

    if (!doc) {
      doc = new UserPreference({
        userId,
        activeQuickActions,
        scopedPreferences: [],
      });
    }

    if (orgId || villaId) {
      if (!Array.isArray(doc.scopedPreferences)) {
        doc.scopedPreferences = [];
      }

      const existingIndex = doc.scopedPreferences.findIndex(
        (sp) => (sp.orgId || '') === orgId && (sp.villaId || '') === villaId
      );

      if (existingIndex >= 0) {
        doc.scopedPreferences[existingIndex].activeQuickActions = activeQuickActions;
      } else {
        doc.scopedPreferences.push({
          orgId,
          villaId,
          activeQuickActions,
        });
      }

      // Keep root activeQuickActions populated as fallback if empty
      if (!doc.activeQuickActions || doc.activeQuickActions.length === 0) {
        doc.activeQuickActions = activeQuickActions;
      }
    } else {
      doc.activeQuickActions = activeQuickActions;
    }

    if (session) {
      await doc.save({ session });
    } else {
      await doc.save();
    }

    return doc;
  }

  /**
   * Create default preferences for a new user if missing
   * @param {string} userId 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async createDefaultPreferences(userId, session = null) {
    return await this.upsertQuickActions(userId, DEFAULT_ACTIVE_QUICK_ACTIONS, {}, session);
  }
}

export default new UserPreferenceRepository();
