import crmThreadService from './crmThread.service.js';

export class CrmThreadController {
  /**
   * Create a new CRM thread for an inquiry.
   */
  async create(req, res, next) {
    try {
      const data = await crmThreadService.createThread(req.body);
      res.success(data, 'CRM Thread created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all CRM threads (paginated).
   */
  async getAll(req, res, next) {
    try {
      const data = await crmThreadService.getThreads(req.query);
      res.success(data, 'CRM Threads retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get CRM thread by Inquiry ID.
   */
  async getByInquiryId(req, res, next) {
    try {
      const { inquiryId } = req.params;
      const data = await crmThreadService.getThreadByInquiryId(inquiryId);
      res.success(data, 'CRM Thread retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a message to an Inquiry thread.
   */
  async addMessage(req, res, next) {
    try {
      const { inquiryId } = req.params;
      const data = await crmThreadService.addMessage(inquiryId, req.body);
      res.success(data, 'Message added to thread successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a CRM thread by ID.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmThreadService.deleteThread(id);
      res.success(data, 'CRM Thread deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new CrmThreadController();
