import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/features/user/user.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Villa from '../src/features/villa/villa.model.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const emailsToDelete = [
      'self@example.com',
      'resident.owner@example.com',
      'resident.tenant@example.com'
    ];

    for (const email of emailsToDelete) {
      const user = await User.findOne({ email });
      if (user) {
        // Delete Org Memberships
        await OrgMembership.deleteMany({ userId: user._id });
        
        // Remove from Villas
        await Villa.updateMany(
          { 'residents.userId': user._id },
          { $pull: { residents: { userId: user._id } } }
        );

        // Delete User
        await User.findByIdAndDelete(user._id);
        
        console.log(`Successfully deleted user and related records: ${email}`);
      } else {
        console.log(`User not found: ${email}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
