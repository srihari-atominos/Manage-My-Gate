import enquiryService from './enquiry.service.js';

class EnquiryController {
  async create(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const result = await enquiryService.createEnquiry(req.body, xRequestId);
      res.success(result, 'Enquiry created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const result = await enquiryService.getAllEnquiries(req.query, xRequestId);
      res.success(result, 'Enquiries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.getEnquiryById(id, xRequestId);
      res.success(result, 'Enquiry retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.updateEnquiryStatus(id, req.body, xRequestId);
      res.success(result, 'Enquiry status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.assignEnquiry(id, req.body, xRequestId);
      res.success(result, 'Enquiry assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async convert(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.convertToCustomer(id, xRequestId);
      res.success(result, 'Enquiry converted to customer successfully');
    } catch (error) {
      next(error);
    }
  }

  async getActivities(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.getActivities(id, xRequestId);
      res.success(result, 'Activities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addActivity(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.addActivity(id, req.body, xRequestId);
      res.success(result, 'Activity added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getStageHistory(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.getStageHistory(id, xRequestId);
      res.success(result, 'Stage history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getInsights(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.getInsights(id, xRequestId);
      res.success(result, 'Insights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStage(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await enquiryService.updateStage(id, req.body, xRequestId);
      res.success(result, 'Stage updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new EnquiryController();
