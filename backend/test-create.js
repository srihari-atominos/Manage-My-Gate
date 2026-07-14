import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import complaintService from './src/features/complaint/complaint.service.js';
import User from './src/features/user/user.model.js';
import Organization from './src/features/organization/organization.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const org = await Organization.findOne();
    const user = await User.findOne({ email: 'testuser@example.com' });
    
    const data = {
      category: 'Electrical',
      title: 'Test Ticket',
      description: 'This is a test description',
      priority: 'High',
      department: 'Electrical',
      attachments: ['test.png'],
      location: {
        flat: '101'
      }
    };
    
    console.log('Testing createComplaint...');
    const result = await complaintService.createComplaint(org._id, user._id, user.username, data, {});
    console.log('Success:', result.complaintNumber);
  } catch (err) {
    console.error('Error creating complaint:');
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

test();
