import crmInquiryService from './crmInquiry.service.js';

export class CrmInquiryController {
  /**
   * Create a new CRM Inquiry.
   */
  async create(req, res, next) {
    try {
      const data = await crmInquiryService.createInquiry(req.body);
      res.success(data, 'CRM Inquiry created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all CRM Inquiries (paginated).
   */
  async getAll(req, res, next) {
    try {
      const data = await crmInquiryService.getInquiries(req.query);
      res.success(data, 'CRM Inquiries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single CRM Inquiry by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmInquiryService.getInquiryById(id);
      res.success(data, 'CRM Inquiry retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a CRM Inquiry.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmInquiryService.updateInquiry(id, req.body);
      res.success(data, 'CRM Inquiry updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a CRM Inquiry.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmInquiryService.deleteInquiry(id);
      res.success(data, 'CRM Inquiry deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new CrmInquiryController();
