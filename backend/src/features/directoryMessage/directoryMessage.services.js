import directoryMessageRepository from './directoryMessage.repository.js';
import directoryMessageEvents from './directoryMessage.events.js';
import User from '../user/user.model.js';
import notificationService from '../notification/notification.service.js';
import HttpError from '../../utils/httpError.utils.js';

export const directoryMessageService = {
  async getOrCreateConversation({ senderId, receiverId, orgId }) {
    if (!senderId || !receiverId || !orgId) {
      throw new HttpError(400, 'Sender, receiver, and organization parameters are required');
    }
    if (senderId.toString() === receiverId.toString()) {
      throw new HttpError(400, 'Cannot start a conversation with yourself');
    }

    // Check recipient user existence and privacy permissions
    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      throw new HttpError(404, 'Recipient user not found');
    }
    if (receiver.allowDirectoryMessages === false) {
      throw new HttpError(403, 'Recipient has disabled direct directory messages');
    }

    const participantIds = [senderId.toString(), receiverId.toString()].sort();
    let conversation = await directoryMessageRepository.findConversationByParticipants(
      orgId,
      participantIds
    );

    if (!conversation) {
      const initialUnreadMap = new Map();
      initialUnreadMap.set(senderId.toString(), 0);
      initialUnreadMap.set(receiverId.toString(), 0);

      conversation = await directoryMessageRepository.createConversation({
        orgId,
        participants: participantIds,
        lastMessage: '',
        lastMessageAt: new Date(),
        unreadCounts: initialUnreadMap,
      });
    }

    return conversation;
  },

  async sendMessage({ senderId, receiverId, orgId, conversationId, text, messageType = 'TEXT' }) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new HttpError(400, 'Message text cannot be empty');
    }

    let conversation;
    if (conversationId) {
      conversation = await directoryMessageRepository.findConversationById(conversationId);
      if (!conversation) {
        throw new HttpError(404, 'Conversation not found');
      }
    } else {
      conversation = await this.getOrCreateConversation({ senderId, receiverId, orgId });
    }

    // Validate that sender is participant
    const isParticipant = conversation.participants.some(
      (p) => (p._id || p).toString() === senderId.toString()
    );
    if (!isParticipant) {
      throw new HttpError(403, 'You are not a participant in this conversation');
    }

    const actualReceiverId = conversation.participants.find(
      (p) => (p._id || p).toString() !== senderId.toString()
    );
    const targetReceiverId = actualReceiverId?._id || actualReceiverId || receiverId;

    // Verify recipient privacy settings
    const receiverUser = await User.findById(targetReceiverId).lean();
    if (receiverUser && receiverUser.allowDirectoryMessages === false) {
      throw new HttpError(403, 'Recipient has disabled direct directory messages');
    }

    const message = await directoryMessageRepository.createMessage({
      conversationId: conversation._id,
      orgId: conversation.orgId || orgId,
      senderId,
      receiverId: targetReceiverId,
      messageType,
      text: text.trim(),
      status: 'sent',
    });

    const updatedConv = await directoryMessageRepository.updateConversationLastMessage(
      conversation._id,
      text.trim(),
      targetReceiverId
    );

    // Trigger Notification
    const senderUser = await User.findById(senderId).lean();
    const senderName = senderUser?.name || 'A resident';

    try {
      await notificationService.createNotification({
        recipientId: targetReceiverId,
        senderId,
        title: `Message from ${senderName}`,
        body: text.trim(),
        actionUrl: `/directory/conversation/${conversation._id}`,
        type: 'INFO',
      });
    } catch (notifErr) {
      // Don't fail message delivery if notification dispatch fails
      console.error('[DirectoryMessage] Notification creation error:', notifErr);
    }

    // Emit Real-time Socket Event
    directoryMessageEvents.emit('message:created', {
      message,
      conversation: updatedConv || conversation,
      receiverId: targetReceiverId,
    });

    return message;
  },

  async getMessages({ conversationId, userId, page = 1, limit = 50 }) {
    const conversation = await directoryMessageRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new HttpError(404, 'Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => (p._id || p).toString() === userId.toString()
    );
    if (!isParticipant) {
      throw new HttpError(403, 'Access denied to this conversation');
    }

    return directoryMessageRepository.findMessagesByConversation(conversationId, page, limit);
  },

  async markConversationRead({ conversationId, userId }) {
    const conversation = await directoryMessageRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new HttpError(404, 'Conversation not found');
    }

    const senderId = conversation.participants.find(
      (p) => (p._id || p).toString() !== userId.toString()
    );

    await directoryMessageRepository.markMessagesRead(conversationId, userId);

    directoryMessageEvents.emit('message:read', {
      conversationId,
      userId,
      senderId: senderId?._id || senderId,
    });

    return { success: true };
  },

  async getUserConversations({ userId, orgId }) {
    return directoryMessageRepository.findUserConversations(orgId, userId);
  },
};

export default directoryMessageService;
