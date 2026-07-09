import mongoose from 'mongoose';
import connectToDb from './src/config/db/mongodbConnectToDb.config.js';
import complaintController from './src/features/complaint/complaint.controller.js';

const run = async () => {
  await connectToDb();
  const req = {
    tenant: { orgId: '6a47a732444a6291458e2372' },
    user: {
      id: '6a47a721444a6291458e2371',
      role: 'Super Admin',
      roleName: undefined
    },
    query: {
      page: 1,
      limit: 10
    }
  };
  const res = {
    success: (data, msg) => {
      console.log('SUCCESS:', JSON.stringify(data, null, 2));
    }
  };
  const next = (err) => {
    console.error('ERROR:', err);
  };
  
  await complaintController.getAll(req, res, next);
  process.exit(0);
};

run();
