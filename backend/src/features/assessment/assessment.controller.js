import assessmentService from './assessment.services.js';

export class AssessmentController {
  /**
   * Create assessment template.
   */
  async create(req, res, next) {
    try {
      const data = await assessmentService.createAssessment(req.body);
      res.success(data, 'Assessment template created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update assessment template.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await assessmentService.updateAssessment(id, req.body);
      
      let message = 'Assessment template updated successfully';
      if (data.hasActiveInvoices) {
        message += '. Warning: Mid-cycle changes only apply to future billing runs.';
      }
      
      res.success(data, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all assessments (filtered & paginated).
   */
  async getAll(req, res, next) {
    try {
      const data = await assessmentService.getAssessments(req.query);
      res.success(data, 'Assessment templates retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete or archive assessment template safely.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await assessmentService.deleteAssessment(id);
      res.success(result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new AssessmentController();
