import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformProvisioningJobEventEmitter extends EventEmitter {}

const provisioningJobEvents = new PlatformProvisioningJobEventEmitter();

provisioningJobEvents.on('jobCreated', (data) => {
  logger.info(`[PlatformProvisioningJob Event] Job created: ${data.jobId} (Status: ${data.status})`);
});

provisioningJobEvents.on('jobStepUpdated', (data) => {
  logger.info(`[PlatformProvisioningJob Event] Job ${data.jobId} updated step: ${data.currentStep} (Status: ${data.status})`);
});

provisioningJobEvents.on('jobCompleted', (data) => {
  logger.info(`[PlatformProvisioningJob Event] Job completed successfully: ${data.jobId}`);
});

provisioningJobEvents.on('jobRetryScheduled', (data) => {
  logger.warn(
    `[PlatformProvisioningJob Event] Job ${data.jobId} scheduled for retry ${data.retryCount}/${data.maxRetries} at ${data.nextRetryAt}. Last error: ${data.lastError}`
  );
});

provisioningJobEvents.on('jobFailed', (data) => {
  logger.error(
    `[PlatformProvisioningJob Event] Job ${data.jobId} moved to MANUAL_REVIEW / FAILED. Retry count: ${data.retryCount}. Error: ${data.lastError}`
  );
});

export default provisioningJobEvents;
