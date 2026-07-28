import repository from './platformProvisioningJob.repository.js';
import events from './platformProvisioningJob.events.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';

// Cross-feature services (strictly Service -> Service communication, never Repositories)
import organizationService from '../organization/organization.services.js';
import workspaceService from '../workspace/workspace.service.js';
import userService from '../user/user.services.js';
import platformSubscriptionService from '../platformSubscription/platformSubscription.service.js';
import platformEntitlementService from '../platformEntitlement/platformEntitlement.service.js';

export class PlatformProvisioningJobService {
  /**
   * Create a new platform provisioning job.
   * @param {Object} jobData
   * @param {ClientSession} [session=null]
   */
  async createJob(jobData, session = null) {
    const { orderId, paymentId, requestedFeatures, organisationId } = jobData;

    if (!orderId || !paymentId) {
      throw new HttpError(400, 'Both orderId and paymentId are required to create a provisioning job.');
    }

    const generatedJobId = jobData.jobId || `PROV-JOB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      jobId: generatedJobId,
      orderId,
      paymentId,
      organisationId: organisationId || null,
      requestedFeatures: Array.isArray(requestedFeatures) ? requestedFeatures : [],
      status: 'PENDING',
      currentStep: 'INIT',
      retryCount: 0,
      maxRetries: jobData.maxRetries || 3,
      lastError: null,
      nextRetryAt: null,
    };

    const job = await repository.create(payload, session);
    events.emit('jobCreated', job);
    return job;
  }

  /**
   * Enqueue a new provisioning job in PENDING state (e.g. from payment.success event listener).
   * @param {Object} params - { orderId, paymentId, requestedFeatures }
   * @param {ClientSession} [session=null]
   */
  async enqueueJob({ orderId, paymentId, requestedFeatures = [] }, session = null) {
    let features = Array.isArray(requestedFeatures) ? requestedFeatures : [];

    if (features.length === 0) {
      features = ['VISITOR_MANAGEMENT', 'BILLING_COLLECTION', 'AMENITY_BOOKING'];
    }

    return await this.createJob(
      {
        orderId,
        paymentId,
        requestedFeatures: features,
        status: 'PENDING',
      },
      session
    );
  }

  /**
   * Find job by database ObjectId.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async getJobById(id, session = null) {
    const job = await repository.findById(id, session);
    if (!job) {
      throw new HttpError(404, `Platform provisioning job with ID ${id} not found.`);
    }
    return job;
  }

  /**
   * Find job by custom jobId string.
   * @param {string} jobId
   * @param {ClientSession} [session=null]
   */
  async getJobByJobId(jobId, session = null) {
    const job = await repository.findByJobId(jobId, session);
    if (!job) {
      throw new HttpError(404, `Platform provisioning job with Job ID ${jobId} not found.`);
    }
    return job;
  }

  /**
   * List jobs with pagination and filter criteria.
   * @param {Object} queryOptions
   */
  async listJobs(queryOptions) {
    return await repository.findAllPaginated(queryOptions);
  }

  /**
   * Manually trigger a retry for a failed or MANUAL_REVIEW job.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async retryJob(id, session = null) {
    const job = await this.getJobById(id, session);

    if (job.status === 'COMPLETED') {
      throw new HttpError(400, 'Cannot retry a completed provisioning job.');
    }

    const updatedJob = await repository.updateById(
      job._id,
      {
        status: 'RETRY_PENDING',
        nextRetryAt: new Date(),
        lastError: null,
      },
      session
    );

    events.emit('jobStepUpdated', updatedJob);
    return updatedJob;
  }

  /**
   * Cancel a job.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async cancelJob(id, session = null) {
    const job = await this.getJobById(id, session);

    if (job.status === 'COMPLETED') {
      throw new HttpError(400, 'Cannot cancel a completed provisioning job.');
    }

    const updatedJob = await repository.updateById(
      job._id,
      {
        status: 'FAILED',
        lastError: 'Job manually cancelled by administrator.',
      },
      session
    );

    events.emit('jobFailed', updatedJob);
    return updatedJob;
  }

  /**
   * Executes the multi-step provisioning pipeline strictly inside the provided Mongoose ClientSession.
   * Steps: CREATE_ORG -> CREATE_WORKSPACE -> CREATE_ADMIN -> ACTIVATE_ENTITLEMENTS -> GENERATE_TEMPLATES -> FINISHED
   *
   * @param {Object} job
   * @param {ClientSession} session
   */
  async executeProvisioningPipeline(job, session) {
    logger.info(`[Provisioning Pipeline] Beginning execution for job ${job.jobId} (Current Step: ${job.currentStep})`);

    // Step 1: CREATE_ORG
    if (job.currentStep === 'INIT' || job.currentStep === 'CREATE_ORG') {
      logger.info(`[Provisioning Pipeline] Executing Step: CREATE_ORG for job ${job.jobId}`);

      let orgId = job.organisationId?._id || job.organisationId;
      if (!orgId) {
        // Orchestrate via organizationService (Service-to-Service)
        const orgData = {
          name: `Org-${job.jobId}`,
          code: `ORG-${Math.floor(1000 + Math.random() * 9000)}`,
          email: `admin-${job.jobId.toLowerCase()}@platform.local`,
          allowedFeatures: job.requestedFeatures || [],
        };
        const createdOrg = await organizationService.createOrganization(orgData, session);
        orgId = createdOrg._id;
      }

      job.organisationId = orgId;
      job.currentStep = 'CREATE_WORKSPACE';
      await repository.updateById(
        job._id,
        { organisationId: orgId, currentStep: 'CREATE_WORKSPACE' },
        session
      );
      events.emit('jobStepUpdated', { jobId: job.jobId, currentStep: 'CREATE_WORKSPACE', status: 'IN_PROGRESS' });
    }

    // Step 2: CREATE_WORKSPACE
    if (job.currentStep === 'CREATE_WORKSPACE') {
      logger.info(`[Provisioning Pipeline] Executing Step: CREATE_WORKSPACE for job ${job.jobId}`);

      const orgId = job.organisationId?._id || job.organisationId;
      const workspacePayload = {
        workspaceName: `Primary Workspace (${job.jobId})`,
        organizationId: orgId,
      };

      // Call workspaceService passing session (Cross-Feature logic)
      try {
        await workspaceService.createWorkspace(workspacePayload, 'SYSTEM_PROVISIONER', session);
      } catch (err) {
        // If workspace already exists, proceed gracefully
        if (!err.message?.includes('already exists') && err.statusCode !== 409) {
          throw err;
        }
      }

      job.currentStep = 'CREATE_ADMIN';
      await repository.updateById(job._id, { currentStep: 'CREATE_ADMIN' }, session);
      events.emit('jobStepUpdated', { jobId: job.jobId, currentStep: 'CREATE_ADMIN', status: 'IN_PROGRESS' });
    }

    // Step 3: CREATE_ADMIN
    if (job.currentStep === 'CREATE_ADMIN') {
      logger.info(`[Provisioning Pipeline] Executing Step: CREATE_ADMIN for job ${job.jobId}`);

      const adminEmail = `admin-${job.jobId.toLowerCase()}@platform.local`;
      const existingUser = await userService.getUserByEmail(adminEmail, session);

      if (!existingUser) {
        const userPayload = {
          name: `Admin ${job.jobId}`,
          email: adminEmail,
          password: `InitPassword123!`,
          organisationId: job.organisationId?._id || job.organisationId,
          role: 'Admin',
        };
        await userService.createUser(userPayload, session);
      }

      job.currentStep = 'ACTIVATE_ENTITLEMENTS';
      await repository.updateById(job._id, { currentStep: 'ACTIVATE_ENTITLEMENTS' }, session);
      events.emit('jobStepUpdated', { jobId: job.jobId, currentStep: 'ACTIVATE_ENTITLEMENTS', status: 'IN_PROGRESS' });
    }

    // Step 4: ACTIVATE_ENTITLEMENTS
    if (job.currentStep === 'ACTIVATE_ENTITLEMENTS') {
      logger.info(`[Provisioning Pipeline] Executing Step: ACTIVATE_ENTITLEMENTS for job ${job.jobId}`);

      const orgId = (job.organisationId?._id || job.organisationId).toString();
      const features = job.requestedFeatures || [];

      // 1. Create/update PlatformSubscription for the Organization inside session
      const subscription = await platformSubscriptionService.createSubscription(
        {
          organisationId: orgId,
          orderId: job.orderId?._id || job.orderId,
          planName: 'Enterprise Standard',
          status: 'ACTIVE',
        },
        session
      );

      // 2. Batch activate PlatformEntitlements for the Organization inside session
      await platformEntitlementService.activateBatch(
        orgId,
        subscription._id,
        features,
        session
      );

      // 3. Service to Service call to update allowedFeatures on Organization model
      await organizationService.updateFeatures(
        orgId,
        orgId,
        features,
        null,
        true, // isPlatformUser flag
        session
      );

      job.currentStep = 'GENERATE_TEMPLATES';
      await repository.updateById(job._id, { currentStep: 'GENERATE_TEMPLATES' }, session);
      events.emit('jobStepUpdated', { jobId: job.jobId, currentStep: 'GENERATE_TEMPLATES', status: 'IN_PROGRESS' });
    }

    // Step 5: GENERATE_TEMPLATES
    if (job.currentStep === 'GENERATE_TEMPLATES') {
      logger.info(`[Provisioning Pipeline] Executing Step: GENERATE_TEMPLATES for job ${job.jobId}`);

      // Finalize setup templates and transition to FINISHED
      job.currentStep = 'FINISHED';
      job.status = 'COMPLETED';
      job.lastError = null;

      await repository.updateById(
        job._id,
        {
          currentStep: 'FINISHED',
          status: 'COMPLETED',
          lastError: null,
        },
        session
      );

      events.emit('jobCompleted', { jobId: job.jobId, status: 'COMPLETED' });
    }

    logger.info(`[Provisioning Pipeline] Completed execution for job ${job.jobId}`);
    return job;
  }
}

export default new PlatformProvisioningJobService();
