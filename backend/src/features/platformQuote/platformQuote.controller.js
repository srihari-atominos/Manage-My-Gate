import platformQuoteService from './platformQuote.service.js';

export class PlatformQuoteController {
  /**
   * Create a new B2B Quote.
   */
  async create(req, res, next) {
    try {
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform User';
      const result = await platformQuoteService.createQuote({
        ...req.body,
        actorId,
        actorName,
      });
      res.success(result, 'Quote created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all quotes (paginated).
   */
  async getAll(req, res, next) {
    try {
      const userRole = req.user?.role?.name || req.user?.role || '';
      const isPlatformAdmin = ['Super Admin', 'Platform Admin', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(userRole);
      
      const queryParams = { ...req.query };
      if (!isPlatformAdmin && (req.user?.orgId || req.user?.organizationId)) {
        queryParams.organizationId = req.user.orgId || req.user.organizationId;
      }

      const data = await platformQuoteService.getQuotes(queryParams);
      res.success(data, 'Quotes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quote by ID or quote number.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformQuoteService.getQuoteById(id);
      res.success(data, 'Quote retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request approval for a quote.
   */
  async requestApproval(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Sales Rep';
      const data = await platformQuoteService.requestApproval(id, actorId, actorName, req.body.comments || '');
      res.success(data, 'Approval requested successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a pending quote.
   */
  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Manager/Admin';
      const data = await platformQuoteService.approveQuote(id, actorId, actorName, req.body.comments || '');
      res.success(data, 'Quote approved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send approved quote to customer.
   */
  async send(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform Rep';
      const data = await platformQuoteService.sendQuote(id, actorId, actorName);
      res.success(data, 'Quote sent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record Customer View.
   */
  async recordView(req, res, next) {
    try {
      const { id } = req.params;
      const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const data = await platformQuoteService.recordCustomerView(id, ip, userAgent);
      res.success(data, 'Customer view recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer Accept Quote (Idempotent SHA-256 token verification).
   */
  async accept(req, res, next) {
    try {
      const { id } = req.params;
      const { token } = req.body;
      const result = await platformQuoteService.acceptQuote(id, token);
      res.success(result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer Reject Quote.
   */
  async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { token, reason } = req.body;
      const data = await platformQuoteService.rejectQuote(id, token, reason);
      res.success(data, 'Quote rejected');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create New Version of Quote.
   */
  async newVersion(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform Rep';
      const result = await platformQuoteService.createNewVersion(id, req.body, actorId, actorName);
      res.success(result, 'New quote version created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Quote Timeline events.
   */
  async getTimeline(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformQuoteService.getQuoteTimeline(id);
      res.success(data, 'Quote timeline retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getApprovals(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformQuoteService.getQuoteApprovals(id);
      res.success(data, 'Quote approval history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete Instant Quote & Order Generation Flow.
   */
  async generateOrder(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform Admin';
      const result = await platformQuoteService.generateOrderForInquiry(id, req.body, actorId, actorName);
      res.success(result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformQuoteController();
