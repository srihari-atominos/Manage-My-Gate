import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join('./.env') });

async function clearCommunities() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  try {
    const db = mongoose.connection.db;

    console.log('Finding communities (non-platform organizations)...');
    
    // Find all non-platform orgs
    const communities = await db.collection('organizations').find({ isPlatform: { $ne: true } }).toArray();
    const communityIds = communities.map(c => c._id);
    
    console.log(`Found ${communityIds.length} communities to delete:`);
    communities.forEach(c => console.log(` - ${c.name}`));

    if (communityIds.length > 0) {
      console.log('Deleting organizations...');
      const resultOrgs = await db.collection('organizations').deleteMany({
        _id: { $in: communityIds }
      });
      console.log(`Deleted ${resultOrgs.deletedCount} organizations.`);

      console.log('Deleting orgmemberships for these communities...');
      const resultMemberships = await db.collection('orgmemberships').deleteMany({
        orgId: { $in: communityIds }
      });
      console.log(`Deleted ${resultMemberships.deletedCount} orgmemberships.`);

      console.log('Deleting roles for these communities...');
      const resultRoles = await db.collection('roles').deleteMany({
        orgId: { $in: communityIds }
      });
      console.log(`Deleted ${resultRoles.deletedCount} tenant roles.`);
    } else {
      console.log('No communities found to delete.');
    }

    console.log('Community cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

clearCommunities();
