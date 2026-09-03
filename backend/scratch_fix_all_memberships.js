import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const ORG_ID = '6a9513437911e056d83636ea';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false, collection: 'orgmemberships' }));
  const Villa = mongoose.model('Villa', new mongoose.Schema({}, { strict: false, collection: 'villas' }));

  // Get Villa 101 for org
  const villa = await Villa.findOne({ orgId: new mongoose.Types.ObjectId(ORG_ID), unitNumber: '101' });
  if (!villa) {
    console.error('Villa 101 not found for organization!');
    process.exit(1);
  }
  console.log('Found Villa 101:', villa._id);

  // Define users to create memberships for
  const userMappings = [
    { email: 'family1@globalcom927.com', roleId: '6a95138311a48f8c46a28598', residentType: 'Family', linkVilla: true },
    { email: 'family2@globalcom927.com', roleId: '6a95138311a48f8c46a2859d', residentType: 'Family', linkVilla: true }, // Wait, family2's roleId is Family Member role, which is 6a95138311a48f8c46a28598
    { email: 'tenant2@globalcom927.com', roleId: '6a9513437911e056d83636ed', residentType: 'Tenant', linkVilla: true },
    { email: 'owner2@globalcom927.com', roleId: '6a9513437911e056d83636ec', residentType: 'Owner', linkVilla: true },
    { email: 'guard2@globalcom927.com', roleId: '6a9513437911e056d83636ee', residentType: 'None', linkVilla: false },
    { email: 'admin2@globalcom927.com', roleId: '6a9513437911e056d83636eb', residentType: 'None', linkVilla: false }
  ];

  // Note: the Family Member role ID is 6a95138311a48f8c46a28598
  const FAMILY_ROLE_ID = '6a95138311a48f8c46a28598';

  for (const item of userMappings) {
    const user = await User.findOne({ email: item.email });
    if (!user) {
      console.warn(`User not found for email: ${item.email}`);
      continue;
    }

    const resolvedRoleId = item.email.includes('family') ? FAMILY_ROLE_ID : item.roleId;

    // Check if membership already exists
    let membership = await OrgMembership.findOne({ userId: user._id, orgId: new mongoose.Types.ObjectId(ORG_ID) });
    if (!membership) {
      membership = await OrgMembership.create({
        userId: user._id,
        orgId: new mongoose.Types.ObjectId(ORG_ID),
        roleId: new mongoose.Types.ObjectId(resolvedRoleId),
        roleIds: [new mongoose.Types.ObjectId(resolvedRoleId)],
        residentType: item.residentType,
        villaId: item.linkVilla ? villa._id : null,
        status: 'Active'
      });
      console.log(`Created membership for ${item.email} in Org ${ORG_ID}`);
    } else {
      await OrgMembership.updateOne({ _id: membership._id }, {
        $set: {
          roleId: new mongoose.Types.ObjectId(resolvedRoleId),
          roleIds: [new mongoose.Types.ObjectId(resolvedRoleId)],
          residentType: item.residentType,
          villaId: item.linkVilla ? villa._id : null,
          status: 'Active'
        }
      });
      console.log(`Updated membership for ${item.email} in Org ${ORG_ID}`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
