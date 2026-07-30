import crmThreadRepository from './crmThread.repository.js';
import crmThreadEvents from './crmThread.events.js';
import crmInquiryService from '../crmInquiry/crmInquiry.service.js';
import HttpError from '../../utils/httpError.utils.js';

export class CrmThreadService {
  /**
   * Create a new CRM Thread for an inquiry.
   * @param {Object} payload
   */
  async createThread(payload) {
    const { inquiryId, messages } = payload;

    // Cross-feature service call to validate inquiry exists
    await crmInquiryService.getInquiryById(inquiryId);

    const existingThread = await crmThreadRepository.findByInquiryId(inquiryId);
    if (existingThread) {
      throw new HttpError(400, 'A CRM thread already exists for this inquiry');
    }

    const newThread = await crmThreadRepository.create({
      inquiryId,
      messages: messages || [],
    });

    crmThreadEvents.emit('threadCreated', newThread);

    return newThread;
  }

  /**
   * Get thread by inquiry ID (or create one if it doesn't exist yet).
   * @param {string} inquiryId
   */
  async getThreadByInquiryId(inquiryId) {
    // Cross-feature service call to validate inquiry
    await crmInquiryService.getInquiryById(inquiryId);

    let thread = await crmThreadRepository.findByInquiryId(inquiryId);
    if (!thread) {
      thread = await crmThreadRepository.create({ inquiryId, messages: [] });
      crmThreadEvents.emit('threadCreated', thread);
    }
    return thread;
  }

  /**
   * Add a message to an inquiry's thread.
   * @param {string} inquiryId
   * @param {Object} messagePayload { senderId, senderType, content, isInternal, messageId, inReplyTo }
   */
  async addMessage(inquiryId, messagePayload) {
    let thread = await crmThreadRepository.findByInquiryId(inquiryId);

    if (!thread) {
      // Validate inquiry before creating thread
      await crmInquiryService.getInquiryById(inquiryId);
      thread = await crmThreadRepository.create({ inquiryId, messages: [] });
      crmThreadEvents.emit('threadCreated', thread);
    }

    const messageData = {
      senderId: messagePayload.senderId || null,
      senderType: messagePayload.senderType,
      content: messagePayload.content,
      isInternal: messagePayload.isInternal !== undefined ? Boolean(messagePayload.isInternal) : false,
      messageId: messagePayload.messageId || null,
      inReplyTo: messagePayload.inReplyTo || null,
      timestamp: new Date(),
    };

    const updatedThread = await crmThreadRepository.addMessage(thread._id, messageData);

    crmThreadEvents.emit('messageAdded', {
      threadId: thread._id,
      inquiryId,
      message: messageData,
    });

    return updatedThread;
  }

  /**
   * Get paginated threads list.
   * @param {Object} queryParams
   */
  async getThreads(queryParams) {
    return await crmThreadRepository.getThreadsPaginated(queryParams);
  }

  /**
   * Get single thread by thread ID.
   * @param {string} id
   */
  async getThreadById(id) {
    const thread = await crmThreadRepository.findById(id);
    if (!thread) {
      throw new HttpError(404, 'CRM Thread not found');
    }
    return thread;
  }

  /**
   * Delete thread by thread ID.
   * @param {string} id
   */
  async deleteThread(id) {
    const existing = await crmThreadRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Thread not found');
    }

    const deleted = await crmThreadRepository.deleteById(id);
    crmThreadEvents.emit('threadDeleted', id);
    return deleted;
  }
}

export default new CrmThreadService();
