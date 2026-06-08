import sampleService from './sampleFeature.services.js';

/**
 * Controller class for routing sample requests.
 */
export class SampleController {
  /**
   * Get all samples.
   */
  async getAll(req, res, next) {
    try {
      const data = await sampleService.getAllSamples();
      res.success(data, 'Samples retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a sample by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await sampleService.getSampleById(id);
      res.success(data, 'Sample retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new sample.
   */
  async create(req, res, next) {
    try {
      const data = await sampleService.createSample(req.body);
      res.success(data, 'Sample created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a sample.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await sampleService.updateSample(id, req.body);
      res.success(data, 'Sample updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a sample.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await sampleService.deleteSample(id);
      res.success(data, 'Sample deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new SampleController();
