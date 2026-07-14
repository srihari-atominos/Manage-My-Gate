import userEvents from '../user/user.events.js';
import Technician from './technician.model.js';

// When a user accepts their invitation and is activated,
// update their linked Technician record (if any) to 'Active'
userEvents.on('USER_ACTIVATED', async ({ userId, session }) => {
  try {
    const technician = await Technician.findOne({ userId }).session(session);
    if (technician && technician.status === 'Pending') {
      technician.status = 'Active';
      await technician.save({ session });
      console.log(`[Technician Listener] Activated technician ${technician._id} for user ${userId}`);
    }
  } catch (error) {
    console.error('[Technician Listener] Error handling USER_ACTIVATED:', error);
  }
});
