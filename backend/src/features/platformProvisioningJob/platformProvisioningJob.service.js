import mongoose from 'mongoose';
import PlatformProvisioningJob from './platformProvisioningJob.model.js';
import logger from '../../utils/logger.utils.js';

class PlatformProvisioningJobService {
  /**
   * Helper to incrementally update the current step outside the transaction
   * so that it persists immediately for admin visibility.
   */
  async _updateStep(jobId, stepName) {
    return await PlatformProvisioningJob.findByIdAndUpdate(
      jobId,
      { currentStep: stepName },
      { new: true }
    ).exec();
  }

  /**
   * 7-Step Automated Zero-Touch Provisioning Pipeline
   * @param {Object} orderData 
   */
  async executeProvisioningPipeline(orderData) {
    // 1. INIT: Create the PlatformProvisioningJob document tracking the progress
    // We create this outside the transaction so it isn't erased if a rollback occurs.
    const job = await PlatformProvisioningJob.create({
      sourceOrderId: orderData._id,
      currentStep: 'INIT',
      status: 'IN_PROGRESS',
    });

    logger.info(`[Provisioning] Job ${job._id} initialized for order ${orderData._id}.`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 2. CREATE_ORG: Create the base Organization record
      await this._updateStep(job._id, 'CREATE_ORG');
      logger.info(`[Provisioning] Simulating: CREATE_ORG`);
      // Simulate: const org = await organizationService.createOrg(..., { session });
      const simulatedOrgId = new mongoose.Types.ObjectId();

      // 3. CREATE_WORKSPACE: Create the specific Workspace linked to the organization
      await this._updateStep(job._id, 'CREATE_WORKSPACE');
      logger.info(`[Provisioning] Simulating: CREATE_WORKSPACE`);
      // Simulate: await workspaceService.createWorkspace({ orgId: simulatedOrgId }, { session });

      // 4. CREATE_ADMIN: Create the User record for the tenant admin
      await this._updateStep(job._id, 'CREATE_ADMIN');
      logger.info(`[Provisioning] Simulating: CREATE_ADMIN`);
      // Simulate: await userService.createUser({ role: 'Tenant Admin' }, { session });

      // 5. ACTIVATE_ENTITLEMENTS: Generate the PlatformSubscription record
      await this._updateStep(job._id, 'ACTIVATE_ENTITLEMENTS');
      logger.info(`[Provisioning] Simulating: ACTIVATE_ENTITLEMENTS`);
      // Simulate: await platformSubscriptionService.activate({ orgId: simulatedOrgId }, { session });

      // 6. GENERATE_TEMPLATES: Seed the workspace with default data
      await this._updateStep(job._id, 'GENERATE_TEMPLATES');
      logger.info(`[Provisioning] Simulating: GENERATE_TEMPLATES`);
      // Simulate: await templateService.seedWorkspace({ orgId: simulatedOrgId }, { session });

      // 7. FINISHED: Commit the transaction and queue the Welcome email
      await this._updateStep(job._id, 'FINISHED');
      logger.info(`[Provisioning] Pipeline finished successfully.`);
      
      // Update job to COMPLETED (can be part of the transaction)
      await PlatformProvisioningJob.findByIdAndUpdate(
        job._id,
        { targetOrganizationId: simulatedOrgId, status: 'COMPLETED' },
        { session }
      );

      // Flawless commit
      await session.commitTransaction();

      // Simulate: Queue Welcome / Onboarding email to Outbox
      // await outboxService.createEvent({ type: 'WELCOME_EMAIL', payload: {...} });

      return job;
    } catch (error) {
      // Flawless rollback: Abort the transaction immediately
      await session.abortTransaction();
      logger.error(`[Provisioning] Pipeline failed. Transaction aborted. Error: ${error.message}`);

      // Update the Job tracker status to FAILED in a separate non-transactional call
      await PlatformProvisioningJob.findByIdAndUpdate(job._id, {
        status: 'FAILED',
        $push: { errorLogs: error.message },
      }).exec();

      throw error;
    } finally {
      // Ensure session is always closed
      session.endSession();
    }
  }

  /**
   * List provisioning jobs with pagination and filters.
   * @param {Object} queryParams
   */
  async listJobs(queryParams) {
    const platformProvisioningJobRepository = (await import('./platformProvisioningJob.repository.js')).default;
    return await platformProvisioningJobRepository.findAllPaginated(queryParams);
  }

  /**
   * Get a job by ID.
   * @param {string} id
   */
  async getJobById(id) {
    const platformProvisioningJobRepository = (await import('./platformProvisioningJob.repository.js')).default;
    const HttpError = (await import('../../utils/httpError.utils.js')).default;
    const job = await platformProvisioningJobRepository.findById(id);
    if (!job) {
      throw new HttpError(404, `Provisioning job with ID '${id}' not found.`);
    }
    return job;
  }

  /**
   * Get a job by string jobId.
   * @param {string} jobId
   */
  async getJobByJobId(jobId) {
    const platformProvisioningJobRepository = (await import('./platformProvisioningJob.repository.js')).default;
    const HttpError = (await import('../../utils/httpError.utils.js')).default;
    const job = await platformProvisioningJobRepository.findByJobId(jobId);
    if (!job) {
      throw new HttpError(404, `Provisioning job '${jobId}' not found.`);
    }
    return job;
  }

  /**
   * Manually retry a provisioning job.
   * @param {string} id
   */
  async retryJob(id) {
    const platformProvisioningJobRepository = (await import('./platformProvisioningJob.repository.js')).default;
    const HttpError = (await import('../../utils/httpError.utils.js')).default;
    const job = await platformProvisioningJobRepository.findById(id);
    if (!job) {
      throw new HttpError(404, `Provisioning job with ID '${id}' not found.`);
    }
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      throw new HttpError(400, `Cannot retry a job with status '${job.status}'.`);
    }
    return await platformProvisioningJobRepository.updateById(id, {
      status: 'RETRY_PENDING',
      nextRetryAt: new Date(),
    });
  }

  /**
   * Cancel a provisioning job.
   * @param {string} id
   */
  async cancelJob(id) {
    const platformProvisioningJobRepository = (await import('./platformProvisioningJob.repository.js')).default;
    const HttpError = (await import('../../utils/httpError.utils.js')).default;
    const job = await platformProvisioningJobRepository.findById(id);
    if (!job) {
      throw new HttpError(404, `Provisioning job with ID '${id}' not found.`);
    }
    if (job.status === 'COMPLETED') {
      throw new HttpError(400, `Cannot cancel a completed job.`);
    }
    return await platformProvisioningJobRepository.updateById(id, {
      status: 'CANCELLED',
    });
  }
}

export default new PlatformProvisioningJobService();
