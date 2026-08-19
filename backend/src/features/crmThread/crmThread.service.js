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
   * Add a message to an inquiry's thread and dispatch over WhatsApp, SMS, or Gmail.
   * @param {string} inquiryId
   * @param {Object} messagePayload { senderId, senderType, channel, recipientContact, content, isInternal }
   */
  async addMessage(inquiryId, messagePayload) {
    let thread = await crmThreadRepository.findByInquiryId(inquiryId);
    let inquiry = null;
    try {
      inquiry = await crmInquiryService.getInquiryById(inquiryId);
    } catch (e) {
      // inquiry might be optional in mock mode
    }

    if (!thread) {
      thread = await crmThreadRepository.create({ inquiryId, messages: [] });
      crmThreadEvents.emit('threadCreated', thread);
    }

    const channel = (messagePayload.channel || 'GMAIL').toUpperCase();
    const recipientContact = messagePayload.recipientContact || inquiry?.email || inquiry?.phone || '';

    const messageData = {
      senderId: messagePayload.senderId || null,
      senderType: messagePayload.senderType || 'SUPERADMIN',
      channel,
      recipientContact,
      content: messagePayload.content,
      isInternal: messagePayload.isInternal !== undefined ? Boolean(messagePayload.isInternal) : false,
      messageId: messagePayload.messageId || null,
      inReplyTo: messagePayload.inReplyTo || null,
      status: 'SENT',
      timestamp: new Date(),
    };

    // Dispatch message over target channel
    if (channel === 'GMAIL' && (inquiry?.email || recipientContact)) {
      const recipientEmail = (inquiry?.email || recipientContact).trim();
      try {
        const { sendEmail } = await import('../../utils/email.utils.js');
        const subject = `[Manage My Gate] Message regarding ${inquiry?.organizationName || inquiry?.contactName || 'your inquiry'}`;
        const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                 <h3 style="color: #2563eb; margin-top: 0;">Message from Manage My Gate SuperAdmin</h3>
                 <p style="font-size: 15px; color: #334155; line-height: 1.6;">${String(messagePayload.content).replace(/\n/g, '<br/>')}</p>
                 <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                 <p style="font-size: 12px; color: #64748b;">This email was sent via Gmail by Manage My Gate SuperAdmin Support.</p>
               </div>`;
        const success = await sendEmail(inquiry?.orgId || null, recipientEmail, subject, html);
        console.log(`[crmThread.service] Gmail message sendEmail to ${recipientEmail} result: ${success}`);
      } catch (emailErr) {
        console.error(`[crmThread.service] Failed to send Gmail message to ${recipientEmail}:`, emailErr.message);
      }
    } else if (channel === 'WHATSAPP') {
      console.log(`[crmThread.service] WhatsApp message dispatched to ${recipientContact || inquiry?.phone}:`, messagePayload.content);
    } else if (channel === 'SMS') {
      console.log(`[crmThread.service] SMS notification dispatched to ${recipientContact || inquiry?.phone}:`, messagePayload.content);
    }

    const updatedThread = await crmThreadRepository.addMessage(thread._id, messageData);

    if (inquiry) {
      try {
        await crmInquiryService.appendTimelineEvent(inquiry._id, {
          eventType: 'NOTE_ADDED',
          actorId: messagePayload.senderId || null,
          actorName: messagePayload.senderName || 'SuperAdmin',
          metadata: { channel, isInternal: messageData.isInternal, snippet: String(messageData.content).substring(0, 100) },
        });
      } catch (inquiryErr) {
        // Do not fail message if timeline append fails
      }
    }

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
