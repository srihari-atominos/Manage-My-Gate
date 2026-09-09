import { v4 as uuidv4 } from 'uuid';
import amenityOutboxService from '../outbox/amenityOutbox.service.js';
import logger, { loggerStorage } from '../../../utils/logger.utils.js';
import AMENITY_WORKER_CONFIG from '../config/amenityWorker.config.js';

export class AmenityOutboxWorker {
  constructor() {
    this.intervalId = null;
    this.isExecuting = false;
    this.intervalMs = AMENITY_WORKER_CONFIG.outbox.intervalMs;
    this.batchSize = AMENITY_WORKER_CONFIG.outbox.batchSize;
    this.staleProcessingTimeoutMs = AMENITY_WORKER_CONFIG.outbox.staleProcessingTimeoutMs;
  }

  /**
   * Initializes periodic polling for pending amenity outbox events.
   * Safe against accidental duplicate calls.
   * @param {Object} [options]
   * @param {number} [options.intervalMs]
   * @param {number} [options.batchSize]
   * @param {number} [options.staleProcessingTimeoutMs]
   */
  initWorker(options = {}) {
    if (this.intervalId) {
      logger.warn('[AmenityOutboxWorker] Worker already running. Skipping duplicate init.');
      return;
    }

    if (options.intervalMs) this.intervalMs = options.intervalMs;
    if (options.batchSize) this.batchSize = options.batchSize;
    if (options.staleProcessingTimeoutMs) this.staleProcessingTimeoutMs = options.staleProcessingTimeoutMs;

    logger.info(`⚙️ [AmenityOutboxWorker] Initialized. Polling every ${this.intervalMs}ms (batchSize: ${this.batchSize})`);

    this.intervalId = setInterval(async () => {
      try {
        await this.runOnce();
      } catch (err) {
        logger.error(`[AmenityOutboxWorker] Polling iteration error: ${err.message}`, { error: err });
      }
    }, this.intervalMs);
  }

  /**
   * Stops background polling interval and cleans up resources.
   */
  stopWorker() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('⚙️ [AmenityOutboxWorker] Stopped successfully.');
    }
  }

  /**
   * Executes a single iteration of outbox processing:
   * 1. Recovers stale PROCESSING leases (zombie cleanup)
   * 2. Bounded sequential atomic claim & dispatch
   * Correlated via loggerStorage with unique execution/job ID.
   * @returns {Promise<{ processedCount: number, successCount: number, failureCount: number, recoveredCount: number, durationMs: number }>}
   */
  async runOnce() {
    if (this.isExecuting) {
      logger.warn('[AmenityOutboxWorker] Previous execution still active. Skipping overlapping run.');
      return { processedCount: 0, successCount: 0, failureCount: 0, recoveredCount: 0, durationMs: 0 };
    }

    this.isExecuting = true;
    const jobId = `worker-amenity-outbox-${uuidv4()}`;
    const startTime = Date.now();

    return loggerStorage.run(jobId, async () => {
      try {
        // Step 1: Recover stale PROCESSING leases before claiming new events
        const recoveredDocs = await amenityOutboxService.recoverStaleProcessing(this.staleProcessingTimeoutMs);
        const recoveredCount = recoveredDocs?.length || 0;
        if (recoveredCount > 0) {
          logger.warn(`[AmenityOutboxWorker] Recovered ${recoveredCount} stale PROCESSING outbox event(s) back to PENDING/DEAD_LETTER`, {
            jobId,
            recoveredCount,
          });
        }

        // Step 2: Sequentially claim and process batch of pending events
        const { processedCount, successCount, failureCount } = await amenityOutboxService.processOutboxBatch(
          this.batchSize
        );

        const durationMs = Date.now() - startTime;

        if (processedCount > 0) {
          logger.info(`[AmenityOutboxWorker] Batch complete in ${durationMs}ms: ${successCount} published, ${failureCount} failed`, {
            jobId,
            workerName: 'AmenityOutboxWorker',
            processedCount,
            successCount,
            failureCount,
            durationMs,
          });
        }

        return { processedCount, successCount, failureCount, recoveredCount, durationMs };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        logger.error(`[AmenityOutboxWorker] Batch execution failed in ${durationMs}ms: ${error.message}`, {
          jobId,
          workerName: 'AmenityOutboxWorker',
          error: error.message,
          durationMs,
        });
        return { processedCount: 0, successCount: 0, failureCount: 0, recoveredCount: 0, durationMs, error: error.message };
      } finally {
        this.isExecuting = false;
      }
    });
  }
}

export const amenityOutboxWorker = new AmenityOutboxWorker();
export default amenityOutboxWorker;
