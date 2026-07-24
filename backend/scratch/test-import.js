import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import app from '../index.js';
import workspaceRouter from '../src/features/workspace/workspace.router.js';
import workspaceService from '../src/features/workspace/workspace.service.js';

console.log('All backend workspace modules and routes imported successfully!');
process.exit(0);
