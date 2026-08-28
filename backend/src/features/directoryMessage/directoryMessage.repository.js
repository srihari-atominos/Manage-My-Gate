import Conversation from './conversation.model.js';
import Message from './message.model.js';

export const directoryMessageRepository = {
  async findConversationByParticipants(orgId, participantIds) {
    return Conversation.findOne({
      orgId,
      participants: { $all: participantIds, $size: participantIds.length },
    }).lean();
  },

  async createConversation(data, session = null) {
    const options = session ? { session } : {};
    const convs = await Conversation.create([data], options);
    return convs[0];
  },

  async findConversationById(id) {
    return Conversation.findById(id).populate('participants', 'name avatar role villaId').lean();
  },

  async findUserConversations(orgId, userId) {
    return Conversation.find({
      orgId,
      participants: userId,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name avatar role phone showPhoneInDirectory allowDirectoryMessages')
      .lean();
  },

  async createMessage(data, session = null) {
    const options = session ? { session } : {};
    const messages = await Message.create([data], options);
    return messages[0];
  },

  async findMessagesByConversation(conversationId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const items = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar')
      .lean();

    const total = await Message.countDocuments({ conversationId });
    return {
      items: items.reverse(),
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async updateConversationLastMessage(conversationId, lastMessage, receiverId) {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return null;

    conv.lastMessage = lastMessage;
    conv.lastMessageAt = new Date();

    const currentUnread = conv.unreadCounts.get(receiverId.toString()) || 0;
    conv.unreadCounts.set(receiverId.toString(), currentUnread + 1);

    await conv.save();
    return conv;
  },

  async markMessagesRead(conversationId, userId) {
    const now = new Date();
    await Message.updateMany(
      { conversationId, receiverId: userId, status: { $ne: 'read' } },
      { $set: { status: 'read', readAt: now } }
    );

    const conv = await Conversation.findById(conversationId);
    if (conv) {
      conv.unreadCounts.set(userId.toString(), 0);
      await conv.save();
    }
  },
};

export default directoryMessageRepository;
