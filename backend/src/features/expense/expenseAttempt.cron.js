import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import logger, { loggerStorage } from '../../utils/logger.utils.js';
import expenseService from './expense.service.js';

class ExpenseAttemptCron {
  init() {
    // Releases balance held by UPI attempts nobody reported an outcome for.
    cron.schedule('*/10 * * * *', async () => {
      await loggerStorage.run(`cron-expense-attempts-${uuidv4()}`, async () => {
        try {
          const { expired } = await expenseService.expireStaleAttempts();
          if (expired) logger.info('Expired stale expense payment attempts', { expired });
        } catch (error) {
          logger.error('Expense attempt expiry cron failed', { error: error.message });
        }
      });
    });
    logger.info('Expense payment attempt expiry cron scheduled (every 10 minutes).');
  }
}

export default new ExpenseAttemptCron();
