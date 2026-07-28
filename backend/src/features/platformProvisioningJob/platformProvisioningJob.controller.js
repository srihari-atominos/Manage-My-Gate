import platformProvisioningJobService from './platformProvisioningJob.service.js';

class PlatformProvisioningJobController {
  /**
   * Create a new provisioning job.
   */
  async createJob(req, res, next) {
    try {
      const job = await platformProvisioningJobService.createJob(req.body);
      return res.status(201).json({
        success: true,
        message: 'Platform provisioning job created successfully.',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List provisioning jobs with pagination and filters.
   */
  async listJobs(req, res, next) {
    try {
      const result = await platformProvisioningJobService.listJobs(req.query);
      return res.status(200).json({
        success: true,
        message: 'Platform provisioning jobs fetched successfully.',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job details by ID or Job ID.
   */
  async getJobById(req, res, next) {
    try {
      const { id } = req.params;
      const job = id.startsWith('PROV-JOB-')
        ? await platformProvisioningJobService.getJobByJobId(id)
        : await platformProvisioningJobService.getJobById(id);

      return res.status(200).json({
        success: true,
        message: 'Platform provisioning job retrieved successfully.',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually retry a provisioning job.
   */
  async retryJob(req, res, next) {
    try {
      const { id } = req.params;
      const job = await platformProvisioningJobService.retryJob(id);

      return res.status(200).json({
        success: true,
        message: 'Platform provisioning job retry scheduled successfully.',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a provisioning job.
   */
  async cancelJob(req, res, next) {
    try {
      const { id } = req.params;
      const job = await platformProvisioningJobService.cancelJob(id);

      return res.status(200).json({
        success: true,
        message: 'Platform provisioning job cancelled successfully.',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformProvisioningJobController();
