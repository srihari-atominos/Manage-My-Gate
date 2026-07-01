import MessageTemplate from './messageTemplate.model.js';

export class MessageTemplateRepository {
  async findAllByOrg(orgId, session = null) {
    return await MessageTemplate.find({ orgId })
      .session(session)
      .sort({ createdAt: -1 });
  }

  async findByPurpose(orgId, type, purpose, session = null) {
    return await MessageTemplate.findOne({ orgId, type, purpose }).session(session);
  }

  async findById(id, session = null) {
    return await MessageTemplate.findById(id).session(session);
  }

  async create(templateData, session = null) {
    const template = new MessageTemplate(templateData);
    return await template.save(session ? { session } : undefined);
  }

  async update(id, orgId, updateData, session = null) {
    return await MessageTemplate.findOneAndUpdate(
      { _id: id, orgId },
      updateData,
      {
        new: true,
        runValidators: true,
        session,
      }
    );
  }

  async delete(id, orgId, session = null) {
    return await MessageTemplate.findOneAndDelete(
      { _id: id, orgId },
      { session }
    );
  }
}

export default new MessageTemplateRepository();
