import communityNoteService from './communityNote.services.js';

export const communityNoteController = {
  async createNote(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.headers['x-organization-id'] || req.user?.orgId;
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
      const orgId = req.headers['x-organization-id'] || req.user?.orgId;
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
      const orgId = req.headers['x-organization-id'] || req.user?.orgId;
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
