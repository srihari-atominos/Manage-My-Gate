import directoryMessageService from './directoryMessage.services.js';
import HttpError from '../../utils/httpError.utils.js';

export const directoryMessageController = {
  async getOrCreateConversation(req, res, next) {
    try {
      const senderId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.orgId;
      if (!orgId) throw new HttpError(400, 'Organization context is required');
      const { receiverId } = req.body;

      const conversation = await directoryMessageService.getOrCreateConversation({
        senderId,
        receiverId,
        orgId,
      });

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req, res, next) {
    try {
      const senderId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.orgId;
      if (!orgId) throw new HttpError(400, 'Organization context is required');
      const { receiverId, conversationId, text, messageType } = req.body;

      const message = await directoryMessageService.sendMessage({
        senderId,
        receiverId,
        orgId,
        conversationId,
        text,
        messageType,
      });

      return res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.orgId;
      if (!orgId) throw new HttpError(400, 'Organization context is required');
      const { conversationId } = req.params;
      const { page, limit } = req.query;

      const data = await directoryMessageService.getMessages({
        conversationId,
        userId,
        orgId,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
      });

      return res.status(200).json({
        success: true,
        data: data.items,
        pagination: {
          totalRecords: data.total,
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          limit: parseInt(limit, 10) || 50,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.orgId;
      if (!orgId) throw new HttpError(400, 'Organization context is required');
      const { conversationId } = req.params;

      const result = await directoryMessageService.markConversationRead({
        conversationId,
        userId,
        orgId,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getConversations(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.orgId;
      if (!orgId) throw new HttpError(400, 'Organization context is required');

      const conversations = await directoryMessageService.getUserConversations({
        userId,
        orgId,
      });

      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default directoryMessageController;
