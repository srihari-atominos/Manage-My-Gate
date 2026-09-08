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
   * Find user preferences by userId and context (orgId, villaId, villaNumber)
   * @param {string} userId 
   * @param {{ orgId?: string, villaId?: string, villaNumber?: string }} [context] 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async findByUserIdAndContext(userId, context = {}, session = null) {
    const doc = await this.findByUserId(userId, session);
    const orgId = context?.orgId ? String(context.orgId).trim() : '';
    const villaId = context?.villaId ? String(context.villaId).trim() : '';
    const villaNumber = context?.villaNumber ? String(context.villaNumber).trim() : '';

    if (!doc) {
      return { activeQuickActions: null, isCustomized: false, doc: null };
    }

    // If context is specified, check scopedPreferences with strict isolation
    if (orgId || villaId || villaNumber) {
      const scopedList = Array.isArray(doc.scopedPreferences) ? doc.scopedPreferences : [];

      // 1. Villa-specific scope
      if (villaId || villaNumber) {
        const villaMatch = scopedList.find((sp) => {
          if (orgId && (sp.orgId || '') !== orgId) {
            return false;
          }
          const vIdMatch = villaId && ((sp.villaId || '') === villaId || (sp.villaNumber || '') === villaId);
          const vNumMatch = villaNumber && ((sp.villaNumber || '') === villaNumber || (sp.villaId || '') === villaNumber);
          return Boolean(vIdMatch || vNumMatch);
        });

        if (villaMatch && Array.isArray(villaMatch.activeQuickActions) && villaMatch.activeQuickActions.length > 0) {
          return {
            activeQuickActions: villaMatch.activeQuickActions,
            isCustomized: true,
            doc,
          };
        }

        // Context specified for this specific villa, but not yet customized.
        // Strictly return null so role defaults are calculated for THIS villa without leakage.
        return {
          activeQuickActions: null,
          isCustomized: false,
          doc,
        };
      }

      // 2. Org-only scope (no villa context, e.g. platform or org administrator)
      if (orgId) {
        const orgMatch = scopedList.find(
          (sp) => (sp.orgId || '') === orgId && (!sp.villaId || sp.villaId === '') && (!sp.villaNumber || sp.villaNumber === '')
        );
        if (orgMatch && Array.isArray(orgMatch.activeQuickActions) && orgMatch.activeQuickActions.length > 0) {
          return {
            activeQuickActions: orgMatch.activeQuickActions,
            isCustomized: true,
            doc,
          };
        }

        return {
          activeQuickActions: null,
          isCustomized: false,
          doc,
        };
      }
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
   * @param {{ orgId?: string, villaId?: string, villaNumber?: string }} [context] 
   * @param {import('mongoose').ClientSession} [session] 
   */
  async upsertQuickActions(userId, activeQuickActions, context = {}, session = null) {
    const orgId = context?.orgId ? String(context.orgId).trim() : '';
    const villaId = context?.villaId ? String(context.villaId).trim() : '';
    const villaNumber = context?.villaNumber ? String(context.villaNumber).trim() : '';

    let doc = await this.findByUserId(userId, session);

    if (!doc) {
      doc = new UserPreference({
        userId,
        activeQuickActions: DEFAULT_ACTIVE_QUICK_ACTIONS,
        scopedPreferences: [],
      });
    }

    if (orgId || villaId || villaNumber) {
      if (!Array.isArray(doc.scopedPreferences)) {
        doc.scopedPreferences = [];
      }

      const existingIndex = doc.scopedPreferences.findIndex((sp) => {
        if (orgId && (sp.orgId || '') !== orgId) return false;

        if (villaId || villaNumber) {
          const vIdMatch = villaId && ((sp.villaId || '') === villaId || (sp.villaNumber || '') === villaId);
          const vNumMatch = villaNumber && ((sp.villaNumber || '') === villaNumber || (sp.villaId || '') === villaNumber);
          return Boolean(vIdMatch || vNumMatch);
        }

        return (!sp.villaId || sp.villaId === '') && (!sp.villaNumber || sp.villaNumber === '');
      });

      if (existingIndex >= 0) {
        doc.scopedPreferences[existingIndex].activeQuickActions = activeQuickActions;
        if (villaId) doc.scopedPreferences[existingIndex].villaId = villaId;
        if (villaNumber) doc.scopedPreferences[existingIndex].villaNumber = villaNumber;
        if (orgId) doc.scopedPreferences[existingIndex].orgId = orgId;
      } else {
        doc.scopedPreferences.push({
          orgId,
          villaId,
          villaNumber,
          activeQuickActions,
        });
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
