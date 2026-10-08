import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, './.env') });

import organizationService from './src/features/organization/organization.services.js';
import User from './src/features/user/user.model.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  try {
    const creatorUser = await User.findOne({ email: 'admin@enterprise.com' });
    if (!creatorUser) throw new Error('Platform admin not found');

    const result = await organizationService.setupWorkspace({
      organization: {
        name: 'Test Org ' + Date.now(),
        organizationType: 'Residential',
        contactPhone: '+91 9876543210',
        contactEmail: 'test' + Date.now() + '@test.com',
        country: 'India',
        state: 'MH',
        city: 'Mumbai',
        timezone: 'Asia/Kolkata'
      },
      communityAdmin: {
        fullName: 'Test Admin',
        username: 'testadmin' + Date.now(),
        email: 'admin' + Date.now() + '@test.com',
        phone: '+91 9876543210',
        password: 'Password123'
      },
      features: ['visitor', 'amenities'],
      creatorUserId: creatorUser._id
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
