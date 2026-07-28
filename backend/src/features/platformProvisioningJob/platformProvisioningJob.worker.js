import mongoose from 'mongoose';
import platformProvisioningJobRepository from './platformProvisioningJob.repository.js';
import platformProvisioningJobService from './platformProvisioningJob.service.js';
import provisioningJobEvents from './platformProvisioningJob.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Process a single provisioning job inside a dedicated Mongoose ClientSession transaction.
 * @param {Object} job
 */
export async function processJob(job) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Mark status as IN_PROGRESS within the session transaction
    await platformProvisioningJobRepository.updateById(
      job._id,
      { status: 'IN_PROGRESS' },
      session
    );

    // 2. Execute provisioning pipeline steps strictly within the session transaction
    await platformProvisioningJobService.executeProvisioningPipeline(job, session);

    // 3. Commit transaction on success
    await session.commitTransaction();
    session.endSession();
    logger.info(`[Provisioning Worker] Successfully finished job ${job.jobId}`);
  } catch (error) {
    // State Machine Recovery:
    // Abort transaction to keep database in consistent state
    await session.abortTransaction();
    session.endSession();

    logger.error(`[Provisioning Worker] Error processing job ${job.jobId}: ${error.message}`);

    const newRetryCount = (job.retryCount || 0) + 1;
    const maxRetries = job.maxRetries || 3;
    const isMaxExceeded = newRetryCount >= maxRetries;

    const newStatus = isMaxExceeded ? 'MANUAL_REVIEW' : 'RETRY_PENDING';
    const backoffMs = Math.pow(2, newRetryCount) * 60 * 1000;
    const nextRetryAt = isMaxExceeded ? null : new Date(Date.now() + backoffMs);

    const updatePayload = {
      retryCount: newRetryCount,
      lastError: error.message,
      status: newStatus,
      nextRetryAt,
    };

    // Save failure/retry state outside the aborted transaction
    await platformProvisioningJobRepository.updateById(job._id, updatePayload);

    if (isMaxExceeded) {
      provisioningJobEvents.emit('jobFailed', {
        jobId: job.jobId,
        retryCount: newRetryCount,
        maxRetries,
        lastError: error.message,
      });
    } else {
      provisioningJobEvents.emit('jobRetryScheduled', {
        jobId: job.jobId,
        retryCount: newRetryCount,
        maxRetries,
        nextRetryAt,
        lastError: error.message,
      });
    }
  }
}

/**
 * Poll database for PENDING or RETRY_PENDING provisioning jobs and process them.
 */
export async function processProvisioningJobs() {
  const batchLimit = 5;
  const readyJobs = await platformProvisioningJobRepository.findPendingOrRetryJobs(batchLimit);

  if (!readyJobs || readyJobs.length === 0) {
    return;
  }

  logger.info(`[Provisioning Worker] Found ${readyJobs.length} job(s) ready for execution.`);

  for (const job of readyJobs) {
    await processJob(job);
  }
}

let pollingInterval = null;

/**
 * Initialize worker polling schedule.
 * @param {number} [intervalMs=30000]
 */
export function initWorker(intervalMs = 30000) {
  logger.info('⚙️ Platform Provisioning Worker initialized.');
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      await processProvisioningJobs();
    } catch (err) {
      logger.error(`[Provisioning Worker] Polling error: ${err.message}`);
    }
  }, intervalMs);
}

/**
 * Stop worker polling schedule.
 */
export function stopWorker() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('⚙️ Platform Provisioning Worker stopped.');
  }
}

export default {
  processJob,
  processProvisioningJobs,
  initWorker,
  stopWorker,
};
