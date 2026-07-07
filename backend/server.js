import http from 'http';
import app from './index.js';
import config from './src/config/config.js';

import './src/features/user/user.listeners.js';
import './src/features/securityLog/securityLog.listeners.js';
import connectToDb from './src/config/db/mongodbConnectToDb.config.js';
import { initSocket } from './src/config/socket.js';
import initializePassport from './src/features/auth/passport/passport.init.js';
import logger from './src/utils/logger.utils.js';
import { syncPermissions } from './src/utils/permissionSync.util.js';

const startServer = async () => {
  try {
    // 1. Connect the database FIRST
    await connectToDb();

    // Run permission synchronization & Super Admin bootstrapping
    try {
      await syncPermissions();
    } catch (syncError) {
      logger.error('Permission sync or Super Admin bootstrap failed. Server will continue to start. Error:', syncError.message);
    }

    // 2. Initialize Passport/SSO
    initializePassport(app);

    // 3. Create HTTP Server wrapping the express app
    const server = http.createServer(app);

    // 4. Initialize Socket.io server
    initSocket(server);

    // 5. Start the app on the designated port
    const port = config.port;
    const host = config.host;
    server.listen(port, () => {
      logger.info(`🚀 Server is running on http://${host}:${port}`);
    });
  } catch (error) {
    logger.error('Server startup FAILED: ', error);
    process.exit(1);
  }
};

startServer();

// trigger restart

// trigger restart 2

// trigger restart 3

// trigger restart 4

// trigger restart 5

// trigger restart 6
