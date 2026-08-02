import cron from 'node-cron';
import User from './user.model.js';
import logger from '../../utils/logger.utils.js';

class UserCron {
  init() {
    logger.info('Initializing User Cron Scheduler...');

    // Run every day at midnight UTC
    cron.schedule('0 0 * * *', async () => {
      logger.info('Running Stale Pending User Deletion Cron Job...');
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await User.deleteMany({
          status: 'Pending Verification',
          createdAt: { $lt: thirtyDaysAgo }
        });

        if (result.deletedCount > 0) {
          logger.info(`Successfully deleted ${result.deletedCount} stale 'Pending Verification' users.`);
        } else {
          logger.info('No stale pending users found for deletion.');
        }
      } catch (error) {
        logger.error('Error in Stale Pending User Deletion Cron Job:', error);
      }
    });
  }
}

export default new UserCron();
