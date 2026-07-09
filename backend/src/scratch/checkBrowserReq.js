import mongoose from 'mongoose';
import config from '../config/config.js';
import complaintService from '../features/complaint/complaint.service.js';

async function run() {
  await mongoose.connect(config.mongodb.uri);
  
  await complaintService.assignTechnician(
    '6a4f27be0feb18b85f245301',
    '6a47a732444a6291458e2372',
    null,
    ['6a4e44ec8cd245d99cc82e98', '6a4f71e678246ff853c318a4'],
    'broadcast',
    null,
    '6a47a721444a6291458e2371',
    'Admin',
    null,
    null,
    '',
    null,
    null,
    {}
  );
  console.log('Successfully assigned in DB!');
  
  mongoose.disconnect();
}

run();
