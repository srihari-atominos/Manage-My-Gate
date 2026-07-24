import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';
import User from '../user/user.model.js';
import notificationService from '../notification/notification.service.js';

class PollEvents extends EventEmitter {}
const pollEvents = new PollEvents();

const notifyUsers = async (poll) => {
  if (poll.status !== 'Active') return;
  try {
    const activeUsers = await User.find({ status: 'Active' });
    logger.info(`Found ${activeUsers.length} active users to notify about poll ${poll._id}`);
    
    let successCount = 0;
    for (const user of activeUsers) {
      try {
        await notificationService.createNotification({
          recipientId: user._id,
          title: 'New Poll Created',
          body: poll.question,
          actionUrl: '/notices/polls',
          type: 'INFO',
          senderId: poll.createdBy
        });
        successCount++;
      } catch (err) {
        logger.error(`Failed to create notification for user ${user._id}:`, err.message);
      }
    }
    logger.info(`Successfully created ${successCount} notifications for poll ${poll._id}`);
  } catch (error) {
    logger.error('Failed to execute notifyUsers for published poll:', error);
  }
};

pollEvents.on('poll_published', (poll) => {
  logger.info(`Poll event bus triggered: poll_published for poll: ${poll._id}`);
  notifyUsers(poll);
});

pollEvents.on('poll_created', (poll) => {
  logger.info(`Poll event bus triggered: poll_created for poll: ${poll._id}`);
  notifyUsers(poll);
});

export default pollEvents;

