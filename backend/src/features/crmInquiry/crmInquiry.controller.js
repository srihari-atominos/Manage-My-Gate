import crmInquiryService from './crmInquiry.service.js';

export class CrmInquiryController {
  /**
   * Register a public CRM lead.
   */
  async registerPublicLead(req, res, next) {
    try {
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Web Public User';
      const data = await crmInquiryService.createInquiry({
        ...req.body,
        originSource: 'WEB_FORM',
        actorId,
        actorName,
      });
      res.success(data, 'Public lead registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new CRM Inquiry.
   */
  async create(req, res, next) {
    try {
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform User';
      const data = await crmInquiryService.createInquiry({
        ...req.body,
        actorId,
        actorName,
      });
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
   * Transition CRM Inquiry Status (PATCH /status).
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, nextStatus, metadata } = req.body;
      const targetStatus = nextStatus || status;

      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform Admin';

      const data = await crmInquiryService.transitionInquiryStatus(
        id,
        targetStatus,
        actorId,
        actorName,
        metadata || {}
      );
      res.success(data, `Inquiry status updated to ${targetStatus}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get immutable Activity Timeline for an inquiry.
   */
  async getTimeline(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmInquiryService.getInquiryTimeline(id);
      res.success(data, 'Inquiry timeline retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get summary overview metrics for an inquiry.
   */
  async getSummary(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmInquiryService.getInquirySummary(id);
      res.success(data, 'Inquiry summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update non-status CRM Inquiry details.
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
   * Assign a CRM Inquiry to a Platform user.
   */
  async assign(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const data = await crmInquiryService.assignInquiry(id, userId);
      res.success(data, 'CRM Inquiry assigned successfully');
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
