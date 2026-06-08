import app from './index.js';
import config from './src/config/config.js';
import connectToDb from './src/config/db/mongodbConnectToDb.config.js';
import initializePassport from './src/features/auth/passport/passport.init.js';
import logger from './src/utils/logger.utils.js';

const startServer = async () => {
  try {
    // 1. Connect the database FIRST
    await connectToDb();

    // 2. Initialize Passport/SSO
    initializePassport(app);

    // 3. Start the app on the designated port
    const port = config.port;
    const host = config.host;
    app.listen(port, () => {
      logger.info(`🚀 Server is running on http://${host}:${port}`);
    });
  } catch (error) {
    logger.error('Server startup FAILED: ', error);
    process.exit(1);
  }
};

startServer();
