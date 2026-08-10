import cron from 'node-cron';
import PlatformSubscription from './platformSubscription.model.js';
import OutboxEvent from '../outbox/outboxEvent.model.js';
import PlatformProvisioningJob from '../platformProvisioningJob/platformProvisioningJob.model.js';
import logger from '../../utils/logger.utils.js';

export const startSubscriptionCron = () => {
  // Run daily at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    logger.info('[CRON] Starting daily subscription lifecycle check...');
    try {
      await processExpiries();
    } catch (error) {
      logger.error('[CRON] Failed to process subscription expiries:', error);
    }

    try {
      await sweepZombies();
    } catch (error) {
      logger.error('[CRON] Failed to sweep zombie provisioning jobs:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};

const processExpiries = async () => {
  // Normalize today to exact midnight for exact day comparison
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const subscriptions = await PlatformSubscription.find({
    status: { $in: ['ACTIVE', 'EXPIRING_SOON'] }
  }).populate('organisationId', 'name contactEmail');

  for (const sub of subscriptions) {
    try {
      // For Active subscriptions, validTill or billingPeriodEnd indicates expiry
      const expiryTarget = sub.billingPeriodEnd || sub.validTill;
      if (!expiryTarget) continue;

      const expiryDate = new Date(expiryTarget);
      expiryDate.setUTCHours(0, 0, 0, 0);

      const diffTime = expiryDate - today;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const org = sub.organisationId;
      const tenantAdminDetails = org ? {
        organisationId: org._id,
        organizationName: org.name,
        contactEmail: org.contactEmail
      } : {
        organisationId: sub.organisationId // fallback if unpopulated
      };

      if (daysRemaining <= 0) {
        // Expiry Day (0 or less)
        sub.status = 'EXPIRED';
        await sub.save();

        await OutboxEvent.create({
          eventType: 'DISPATCH_EXPIRED_NOTICE',
          payload: {
            ...tenantAdminDetails,
            daysRemaining: 0
          }
        });
        logger.info(`[CRON] Subscription ${sub._id} expired.`);
      } else if ([14, 7, 3, 2, 1].includes(daysRemaining)) {
        // Warning Days
        if (sub.status === 'ACTIVE') {
          sub.status = 'EXPIRING_SOON';
          await sub.save();
        }

        await OutboxEvent.create({
          eventType: 'DISPATCH_EXPIRY_WARNING',
          payload: {
            ...tenantAdminDetails,
            daysRemaining
          }
        });
        logger.info(`[CRON] Expiry warning (${daysRemaining} days) queued for subscription ${sub._id}.`);
      }
    } catch (err) {
      // Isolate error per record to prevent crashing the whole batch
      logger.error(`[CRON] Error processing subscription ${sub._id}:`, err);
    }
  }
};

const sweepZombies = async () => {
  const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

  const result = await PlatformProvisioningJob.updateMany(
    {
      status: 'IN_PROGRESS',
      updatedAt: { $lt: cutoffTime }
    },
    {
      $set: { status: 'FAILED' },
      $push: { errorLogs: 'System crash detected during provisioning.' }
    }
  );

  if (result.modifiedCount > 0) {
    logger.info(`[CRON] Swept ${result.modifiedCount} zombie provisioning jobs.`);
  }
};

export default { startSubscriptionCron };
