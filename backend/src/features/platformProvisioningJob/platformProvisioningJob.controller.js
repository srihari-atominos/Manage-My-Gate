import platformProvisioningJobService from './platformProvisioningJob.service.js';

export class PlatformProvisioningJobController {
  async getAll(req, res, next) {
    try {
      const data = await platformProvisioningJobService.getWorkflows(req.query);
      res.success(data, 'Provisioning workflows retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCheckpoints(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformProvisioningJobService.getWorkflowCheckpoints(id);
      res.success(data, 'Provisioning checkpoints retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async retryFromCheckpoint(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformProvisioningJobService.retryWorkflowFromCheckpoint(id);
      res.success(result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformProvisioningJobController();
