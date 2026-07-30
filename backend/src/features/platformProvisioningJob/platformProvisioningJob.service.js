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
import platformOrderService from '../platformOrder/platformOrder.service.js';

/**
 * Safely adds N months to a date, avoiding end-of-month rollover issues (e.g. Jan 31 + 1 month = Feb 28/29).
 */
const addMonthsSafely = (startDate, months) => {
  const d = new Date(startDate);
  const targetMonth = d.getMonth() + Number(months);
  const targetYear = d.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const originalDate = d.getDate();
  d.setFullYear(targetYear, normalizedMonth, 1);
  const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  d.setDate(Math.min(originalDate, daysInTargetMonth));
  return d;
};

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
   * @param {Object} params - { orderId, paymentId, organisationId, requestedFeatures }
   * @param {ClientSession} [session=null]
   */
  async enqueueJob({ orderId, paymentId, organisationId = null, requestedFeatures = [] }, session = null) {
    let features = Array.isArray(requestedFeatures) ? requestedFeatures : [];

    if (features.length === 0) {
      features = ['VISITOR_MANAGEMENT', 'BILLING_COLLECTION', 'AMENITY_BOOKING'];
    }

    return await this.createJob(
      {
        orderId,
        paymentId,
        organisationId,
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

    // Phase 4 Canonical Pipeline Execution
    // Step 1: CREATE_ORG (Canonical check for pre-existing Organization)
    if (job.currentStep === 'INIT' || job.currentStep === 'CREATE_ORG') {
      logger.info(`[Provisioning Pipeline] Executing Step: CREATE_ORG for job ${job.jobId}`);

      const orgId = job.organisationId?._id || job.organisationId;
      if (!orgId) {
        throw new HttpError(400, 'Canonical provisioning requires an existing organisationId.');
      }

      // Verify existing Organization in database (Service-to-Service)
      const targetOrg = await organizationService.getOrganizationById(orgId, session);
      if (!targetOrg) {
        throw new HttpError(404, `Target Organization with ID '${orgId}' not found.`);
      }

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
        // If workspace already exists, proceed gracefully (Idempotency)
        if (!err.message?.includes('already exists') && err.statusCode !== 409) {
          throw err;
        }
      }

      job.currentStep = 'CREATE_ADMIN';
      await repository.updateById(job._id, { currentStep: 'CREATE_ADMIN' }, session);
      events.emit('jobStepUpdated', { jobId: job.jobId, currentStep: 'CREATE_ADMIN', status: 'IN_PROGRESS' });
    }

    // Step 3: CREATE_ADMIN (Real Customer Email Resolution & Idempotency)
    if (job.currentStep === 'CREATE_ADMIN') {
      logger.info(`[Provisioning Pipeline] Executing Step: CREATE_ADMIN for job ${job.jobId}`);

      const orgId = job.organisationId?._id || job.organisationId;
      const targetOrg = await organizationService.getOrganizationById(orgId, session);

      // Resolve real customer email from Organization contactEmail or PlatformOrder
      let adminEmail = targetOrg?.contactEmail;
      const rawOrderId = job.orderId?._id || job.orderId;
      if (!adminEmail && rawOrderId) {
        try {
          const order = await platformOrderService.getOrderById(rawOrderId);
          adminEmail = order?.contactEmail || order?.orderSnapshot?.contactEmail;
        } catch (err) {
          logger.warn(`[Provisioning Pipeline] Could not fetch order to extract contact email: ${err.message}`);
        }
      }

      if (!adminEmail) {
        adminEmail = `admin-${orgId.toString().slice(-6)}@platform.local`;
      }

      const existingUser = await userService.getUserByEmail(adminEmail, session);

      if (!existingUser) {
        const userPayload = {
          name: `${targetOrg?.name || 'Customer'} Admin`,
          email: adminEmail,
          password: `InitPassword123!`,
          organisationId: orgId,
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

      const rawOrderId = job.orderId?._id || job.orderId;
      let planName = 'Enterprise Standard';
      let validityInMonths = 12;

      if (rawOrderId) {
        try {
          const order = await platformOrderService.getOrderById(rawOrderId);
          if (order && order.orderSnapshot) {
            planName = order.orderSnapshot.planName || planName;
            validityInMonths = order.orderSnapshot.validityInMonths || validityInMonths;
          }
        } catch (err) {
          logger.warn(`Could not fetch order ${rawOrderId} during provisioning. Fallback to default pricing snapshot: ${err.message}`);
        }
      }

      const billingPeriodStart = new Date();
      const billingPeriodEnd = addMonthsSafely(billingPeriodStart, validityInMonths);

      // 1. Create/update PlatformSubscription dynamically for the Organization inside session
      const subscription = await platformSubscriptionService.createSubscription(
        {
          organisationId: orgId,
          orderId: rawOrderId,
          planName,
          status: 'ACTIVE',
          billingPeriodStart,
          billingPeriodEnd,
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

    // Step 5: GENERATE_TEMPLATES & Organization Activation
    if (job.currentStep === 'GENERATE_TEMPLATES') {
      logger.info(`[Provisioning Pipeline] Executing Step: GENERATE_TEMPLATES for job ${job.jobId}`);

      const orgId = job.organisationId?._id || job.organisationId;

      // Transition Organization status from 'Draft' to 'Active' upon successful provisioning completion
      if (orgId) {
        try {
          await organizationService.changeOrganizationStatus(orgId, 'Active', null, session);
          logger.info(`[Provisioning Pipeline] Successfully transitioned Organization ${orgId} status from Draft to Active.`);
        } catch (err) {
          logger.warn(`[Provisioning Pipeline] Organization status update to Active yielded: ${err.message}`);
        }
      }

      // Finalize setup templates and transition job to FINISHED
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

      // Fetch organization details for transactional notification
      let targetOrg = null;
      if (orgId) {
        try {
          targetOrg = await organizationService.getOrganizationById(orgId, session);
        } catch (err) {
          logger.warn(`[Provisioning Pipeline] Organization lookup yielded: ${err.message}`);
        }
      }

      const customerEmail = targetOrg?.contactEmail || 'admin@organization.com';
      const organizationName = targetOrg?.name || 'Your Organization';
      const workspaceUrl = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/workspace` : 'https://app.managemygate.com';

      // Create outbox event for PROVISIONING_COMPLETED_EMAIL
      try {
        const OutboxEvent = (await import('../outbox/outboxEvent.model.js')).default;
        const outboxEvent = new OutboxEvent({
          eventType: 'PROVISIONING_COMPLETED_EMAIL',
          payload: {
            orgId,
            customerEmail,
            workspaceUrl,
            organizationName,
          },
          status: 'PENDING',
          retries: 0,
        });
        await outboxEvent.save({ session });
      } catch (outboxErr) {
        logger.error(`[Provisioning Pipeline] Failed to create PROVISIONING_COMPLETED_EMAIL outbox event: ${outboxErr.message}`);
      }

      events.emit('jobCompleted', { jobId: job.jobId, status: 'COMPLETED' });
    }

    logger.info(`[Provisioning Pipeline] Completed execution for job ${job.jobId}`);
    return job;
  }
}

export default new PlatformProvisioningJobService();
