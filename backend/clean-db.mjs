import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, './.env') });

async function clearDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  try {
    const db = mongoose.connection.db;

    // Preserve these users
    const preservedEmails = ['naveen@atominosconsulting.com', 'admin@enterprise.com'];

    // 1. Clean Users
    console.log('Cleaning users...');
    const resultUsers = await db.collection('users').deleteMany({
      email: { $nin: preservedEmails }
    });
    console.log(`Deleted ${resultUsers.deletedCount} users.`);

    // Keep the platform org if one of the users belongs to it.
    // Wait, let's just find the orgs these preserved users belong to, to not break their platform access.
    const preservedUsers = await db.collection('users').find({ email: { $in: preservedEmails } }).toArray();
    const preservedUserIds = preservedUsers.map(u => u._id);

    console.log('Preserved Users:', preservedUsers.map(u => u.email));

    // Find memberships of preserved users
    const preservedMemberships = await db.collection('orgmemberships').find({ userId: { $in: preservedUserIds } }).toArray();
    const preservedOrgIds = preservedMemberships.map(m => m.orgId);
    
    // We want to delete ALL organization data, BUT should we delete the platform org?
    // "delete the all organisation data in db"
    // Usually the platform org is required for Super Admins to log in.
    // Let's delete all orgs EXCEPT the ones the preserved users belong to (Platform Org).
    console.log('Cleaning organizations...');
    const resultOrgs = await db.collection('organizations').deleteMany({
      _id: { $nin: preservedOrgIds }
    });
    console.log(`Deleted ${resultOrgs.deletedCount} organizations.`);

    console.log('Cleaning orgmemberships...');
    const resultMemberships = await db.collection('orgmemberships').deleteMany({
      userId: { $nin: preservedUserIds }
    });
    console.log(`Deleted ${resultMemberships.deletedCount} orgmemberships.`);

    console.log('Cleaning roles...');
    const resultRoles = await db.collection('roles').deleteMany({
      orgId: { $nin: preservedOrgIds, $ne: null }
    });
    console.log(`Deleted ${resultRoles.deletedCount} tenant roles.`);

    console.log('Cleaning invitations...');
    const resultInvitations = await db.collection('invitations').deleteMany({});
    console.log(`Deleted ${resultInvitations.deletedCount} invitations.`);

    console.log('Cleaning otps...');
    const resultOtps = await db.collection('otps').deleteMany({});
    console.log(`Deleted ${resultOtps.deletedCount} otps.`);

    console.log('Database cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

clearDB();
