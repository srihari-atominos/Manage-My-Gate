import communityNoteService from './communityNote.services.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';

const getResolvedOrgId = async (req) => {
  let rawOrgId =
    req.headers['x-organization-id'] ||
    req.headers['x-org-id'] ||
    req.user?.orgId ||
    req.user?.organizationId ||
    req.user?.activeOrgId;

  if (typeof rawOrgId === 'object' && rawOrgId !== null) {
    rawOrgId = rawOrgId._id || rawOrgId.id || String(rawOrgId);
  }

  if (!rawOrgId && (req.user?.id || req.user?._id)) {
    const userId = req.user.id || req.user._id;
    const membership = await OrgMembership.findOne({ userId, status: 'Active' }).lean();
    if (membership?.orgId) {
      rawOrgId = membership.orgId;
    }
  }

  return rawOrgId ? String(rawOrgId) : null;
};

export const communityNoteController = {
  async createNote(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = await getResolvedOrgId(req);
      if (!userId || !orgId) {
        return res.status(400).json({ success: false, message: 'Authenticated user and organization context are required' });
      }

      const { text, category, emoji } = req.body;
      const note = await communityNoteService.createNote({
        userId,
        orgId,
        text,
        category,
        emoji,
      });

      return res.status(201).json({
        success: true,
        data: note,
        message: 'Community note published successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyNote(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = await getResolvedOrgId(req);
      if (!userId || !orgId) {
        return res.status(400).json({ success: false, message: 'User and organization context required' });
      }

      const note = await communityNoteService.getMyActiveNote(userId, orgId);
      return res.status(200).json({
        success: true,
        data: note || null,
      });
    } catch (err) {
      next(err);
    }
  },

  async getActiveNotes(req, res, next) {
    try {
      const orgId = await getResolvedOrgId(req);
      if (!orgId) {
        return res.status(400).json({ success: false, message: 'Organization context required' });
      }

      const notes = await communityNoteService.getActiveNotes(orgId);
      return res.status(200).json({
        success: true,
        data: notes || [],
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteNote(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const { id } = req.params;
      await communityNoteService.deleteNote(id, userId);
      return res.status(200).json({
        success: true,
        message: 'Community note removed successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

export default communityNoteController;
