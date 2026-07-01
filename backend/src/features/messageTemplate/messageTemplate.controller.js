import messageTemplateService from './messageTemplate.service.js';

export class MessageTemplateController {
  async getTemplates(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await messageTemplateService.getTemplatesByOrg(orgId);
      res.success(data, 'Templates retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req, res, next) {
    try {
      const userId = req.user.id;
      const orgId = req.tenant.orgId;
      const { name, type, purpose, subject, cc, bcc, body } = req.body;

      const data = await messageTemplateService.createTemplate(
        userId,
        orgId,
        { name, type, purpose, subject, cc, bcc, body }
      );
      res.success(data, 'Template created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { id } = req.params;
      const { name, type, purpose, subject, cc, bcc, body } = req.body;

      const data = await messageTemplateService.updateTemplate(
        id,
        orgId,
        { name, type, purpose, subject, cc, bcc, body }
      );
      res.success(data, 'Template updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { id } = req.params;

      const data = await messageTemplateService.deleteTemplate(id, orgId);
      res.success(data, 'Template deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export default new MessageTemplateController();
