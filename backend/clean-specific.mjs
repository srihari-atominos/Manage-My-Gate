import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join('./.env') });

async function cleanSpecificData() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  try {
    const db = mongoose.connection.db;

    // 1. Delete the user
    console.log('Deleting user naveenpv5886@gmail.com...');
    const userResult = await db.collection('users').findOneAndDelete({ email: 'naveenpv5886@gmail.com' });
    let deletedUserId = null;
    if (userResult && userResult._id) {
      deletedUserId = userResult._id;
      console.log(`Deleted user: ${userResult.email}`);
    } else {
      console.log('User naveenpv5886@gmail.com not found.');
    }

    // 2. Delete the community
    console.log('Deleting Nexus Community...');
    const orgsCursor = await db.collection('organizations').find({ name: 'Nexus Community' }).toArray();
    const orgIds = orgsCursor.map(o => o._id);
    
    if (orgIds.length > 0) {
      const resultOrgs = await db.collection('organizations').deleteMany({ _id: { $in: orgIds } });
      console.log(`Deleted ${resultOrgs.deletedCount} organizations named "Nexus Community".`);

      console.log('Deleting orgmemberships for Nexus Community...');
      const resultMemberships = await db.collection('orgmemberships').deleteMany({ orgId: { $in: orgIds } });
      console.log(`Deleted ${resultMemberships.deletedCount} orgmemberships.`);

      console.log('Deleting roles for Nexus Community...');
      const resultRoles = await db.collection('roles').deleteMany({ orgId: { $in: orgIds } });
      console.log(`Deleted ${resultRoles.deletedCount} roles.`);
    } else {
      console.log('Nexus Community not found.');
    }

    // If the user was deleted, also clean up any hanging memberships for them
    if (deletedUserId) {
      const userMemberships = await db.collection('orgmemberships').deleteMany({ userId: deletedUserId });
      console.log(`Deleted ${userMemberships.deletedCount} extra orgmemberships for the user.`);
    }

    console.log('Specific cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanSpecificData();
