import mongoose from 'mongoose';
import messageTemplateRepository from './messageTemplate.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class MessageTemplateService {
  async getTemplatesByOrg(orgId) {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID is required.');
    }
    return await messageTemplateRepository.findAllByOrg(orgId);
  }

  async getTemplateByPurpose(orgId, type, purpose) {
    if (!orgId || !type || !purpose) {
      throw new HttpError(400, 'Organization ID, type, and purpose are required.');
    }
    return await messageTemplateRepository.findByPurpose(orgId, type, purpose);
  }

  async createTemplate(userId, orgId, templateData) {
    const { name, type, purpose, subject, cc, bcc, body } = templateData;
    if (!orgId || !userId || !name || !type || !purpose || !body) {
      throw new HttpError(400, 'Missing required message template parameters.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Enforce unique compound key: orgId + type + purpose
      const existing = await messageTemplateRepository.findByPurpose(orgId, type, purpose, session);
      if (existing) {
        throw new HttpError(400, `A template already exists for channel type '${type}' and purpose '${purpose}' in this organization.`);
      }

      const template = await messageTemplateRepository.create(
        {
          orgId,
          name,
          type,
          purpose,
          subject,
          cc,
          bcc,
          body,
          createdBy: userId,
        },
        session
      );

      await session.commitTransaction();
      return template;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateTemplate(id, orgId, updateData) {
    const { name, type, purpose, subject, cc, bcc, body } = updateData;
    if (!id || !orgId || !name || !type || !purpose || !body) {
      throw new HttpError(400, 'Missing required message template parameters.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Verify if another template conflicts with orgId + type + purpose
      const existing = await messageTemplateRepository.findByPurpose(orgId, type, purpose, session);
      if (existing && existing._id.toString() !== id) {
        throw new HttpError(400, `A template already exists for channel type '${type}' and purpose '${purpose}' in this organization.`);
      }

      const updated = await messageTemplateRepository.update(
        id,
        orgId,
        { name, type, purpose, subject, cc, bcc, body },
        session
      );

      if (!updated) {
        throw new HttpError(404, `No template found for ID: ${id}`);
      }

      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteTemplate(id, orgId) {
    if (!id || !orgId) {
      throw new HttpError(400, 'Template ID and Organization ID are required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const deleted = await messageTemplateRepository.delete(id, orgId, session);
      if (!deleted) {
        throw new HttpError(404, `No template found for ID: ${id}`);
      }
      await session.commitTransaction();
      return deleted;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new MessageTemplateService();
