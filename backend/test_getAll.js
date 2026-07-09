import complaintController from './src/features/complaint/complaint.controller.js';
import mongoose from 'mongoose';

const req = {
  tenant: { orgId: '6a47a732444a6291458e2372' },
  user: { id: '6a47a721444a6291458e2371', roleName: 'Resident' },
  query: { page: '1', limit: '10', search: '', status: 'All Statuses' }
};

const res = {
  success: (data) => {
    console.log('SUCCESS:', JSON.stringify(data, null, 2));
    process.exit(0);
  },
  status: (code) => res,
  json: (data) => {
    console.log('JSON:', data);
    process.exit(0);
  }
};

const next = (err) => {
  console.error('ERROR:', err);
  process.exit(1);
};

mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false').then(() => {
  complaintController.getAll(req, res, next);
});
