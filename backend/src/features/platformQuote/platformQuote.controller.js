import platformQuoteService from './platformQuote.service.js';

class PlatformQuoteController {
  /**
   * Create a new platform quote.
   */
  async create(req, res, next) {
    try {
      const payload = {
        ...req.body,
        createdBy: req.user ? req.user._id : req.body.createdBy,
      };
      const result = await platformQuoteService.createQuote(payload);
      res.success(result, 'Platform quote created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all platform quotes.
   */
  async getAll(req, res, next) {
    try {
      const result = await platformQuoteService.getAllQuotes(req.query);
      res.success(result, 'Platform quotes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quote by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformQuoteService.getQuoteById(id);
      res.success(result, 'Platform quote retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quote by number.
   */
  async getByNumber(req, res, next) {
    try {
      const { quoteNumber } = req.params;
      const result = await platformQuoteService.getQuoteByNumber(quoteNumber);
      res.success(result, 'Platform quote retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Instantly Generate Order from Quote.
   */
  async generateInstantOrder(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformQuoteService.generateInstantOrder(id);
      res.success(result, 'Order generated successfully from quote', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update quote.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformQuoteService.updateQuote(id, req.body);
      res.success(result, 'Platform quote updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete quote.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformQuoteService.deleteQuote(id);
      res.success(result, 'Platform quote deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformQuoteController();
