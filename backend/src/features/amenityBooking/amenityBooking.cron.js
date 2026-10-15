import cron from 'node-cron';
import amenityBookingService from './amenityBooking.services.js';
import logger from '../../utils/logger.utils.js';

class AmenityBookingCron {
  init() {
    // Every 5 minutes: release online bookings whose payment was never completed, so the slot is not
    // blocked for everyone else.
    cron.schedule('*/5 * * * *', async () => {
      try {
        const released = await amenityBookingService.expireUnpaidOnlineBookings();
        if (released > 0) {
          logger.info(`[AmenityBookingCron] Released ${released} unpaid online booking(s)`);
        }
      } catch (error) {
        logger.error(`[AmenityBookingCron] Unpaid booking sweep failed: ${error.message}`);
      }
    });
  }
}

export default new AmenityBookingCron();
