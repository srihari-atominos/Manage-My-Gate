import pollEvents from './poll.events.js';
import Notification from '../notification/notification.model.js';
import notificationEvents from '../notification/notification.events.js';
import User from '../user/user.model.js';
import logger from '../../utils/logger.utils.js';

const sendPollNotifications = async (poll, title, body, type = 'INFO') => {
  try {
    // Find all users in the organization who should receive the notification
    // Typically residents and admins. We can exclude guards based on roles, but for simplicity, 
    // we fetch users in the org who have notices:read permission or are platform admins.
    // For now, getting all active users in the org.
    const users = await User.find({ currentOrgId: poll.orgId, status: 'Active' }).select('_id');
    
    if (users.length === 0) return;

    const notifications = users.map(u => ({
      recipientId: u._id,
      senderId: poll.createdBy, // The user who created the poll
      title,
      body,
      type,
      actionUrl: `/notices/polls`
    }));

    const insertedNotifications = await Notification.insertMany(notifications);
    
    // Emit real-time socket events for each inserted notification
    insertedNotifications.forEach(notification => {
      notificationEvents.emit('notification_created', notification);
    });

    logger.info(`[Poll Notification] Sent '${title}' to ${users.length} users in org ${poll.orgId}`);
  } catch (error) {
    logger.error(`[Poll Notification] Failed to send notifications:`, error);
  }
};

pollEvents.on('poll_created', async (poll) => {
  if (poll.status === 'Active') {
    const title = 'New Community Poll Created';
    const body = `A new poll "${poll.question}" has been created. Cast your vote now!`;
    await sendPollNotifications(poll, title, body, 'INFO');
  }
});

pollEvents.on('poll_published', async (poll) => {
  const title = 'New Community Poll Published';
  const body = `A new poll "${poll.question}" has been published. Cast your vote now!`;
  await sendPollNotifications(poll, title, body, 'INFO');
});

pollEvents.on('poll_closed', async (poll) => {
  const title = 'Community Poll Closed';
  const body = `The poll "${poll.question}" has been closed. Check out the final results.`;
  await sendPollNotifications(poll, title, body, 'SUCCESS');
});

// We could add 'poll_closing_soon' from a cron job checking polls expiring in next 24h
pollEvents.on('poll_closing_soon', async (poll) => {
  const title = 'Poll Closing Soon!';
  const body = `The poll "${poll.question}" is closing in 24 hours. Vote before it's too late!`;
  await sendPollNotifications(poll, title, body, 'WARNING');
});
