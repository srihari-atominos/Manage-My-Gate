import cron from 'node-cron';
import Poll from './poll.model.js';
import pollEvents from './poll.events.js';
import logger from '../../utils/logger.utils.js';

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const now = new Date();
    
    // Find polls that are active and have passed their end date
    const expiredPolls = await Poll.find({
      status: 'Active',
      endDate: { $lte: now }
    });

    if (expiredPolls.length > 0) {
      logger.info(`[Poll Cron] Found ${expiredPolls.length} expired polls. Closing them...`);
      
      for (const poll of expiredPolls) {
        try {
          const updatedPoll = await Poll.findOneAndUpdate(
            { _id: poll._id, status: 'Active' },
            { $set: { status: 'Closed', closedAt: now } },
            { new: true }
          );
          
          if (updatedPoll) {
            pollEvents.emit('poll_closed', updatedPoll);
            logger.info(`[Poll Cron] Successfully closed poll ${poll._id}.`);
          }
        } catch (pollError) {
          logger.error(`[Poll Cron] Failed to close poll ${poll._id}:`, pollError);
        }
      }
    }

    // Check for polls closing in exactly 24 hours (with a 10 min window since cron runs every 10 min)
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(twentyFourHoursFromNow.getTime() - 5 * 60 * 1000); // -5 mins
    const windowEnd = new Date(twentyFourHoursFromNow.getTime() + 5 * 60 * 1000); // +5 mins

    const closingSoonPolls = await Poll.find({
      status: 'Active',
      endDate: { $gte: windowStart, $lte: windowEnd }
    });

    for (const poll of closingSoonPolls) {
      pollEvents.emit('poll_closing_soon', poll);
    }

  } catch (error) {
    logger.error('[Poll Cron] Error during auto-close job:', error);
  }
});
