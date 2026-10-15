/**
 * One-off migration for the Community Staff (Global Staff) / Unit Staff (Internal Staff) split.
 *
 * 1. Default "Community Staff" roles that were created with the old dual STAFF scope move to COMMUNITY_STAFF
 *    (and stop being tenant roles).
 * 2. Every staff directory record gets an explicit staffCategory:
 *      - UNIT when the linked member holds a role with scope STAFF (Unit Staff, e.g. Household Staff),
 *      - COMMUNITY otherwise (unchanged behaviour: still open to residents unless marked community-only).
 *
 * Idempotent; run with `node src/scripts/migrate_staff_categories.mjs [--dry-run]` from backend/.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/database_name';
const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const roles = mongoose.connection.collection('roles');
  const memberships = mongoose.connection.collection('orgmemberships');
  const technicians = mongoose.connection.collection('technicians');

  const roleFilter = { name: 'Community Staff', roleScope: 'STAFF' };
  const legacyCommunityRoles = await roles.countDocuments(roleFilter);
  console.log(`Community Staff roles to move to COMMUNITY_STAFF: ${legacyCommunityRoles}`);
  if (!DRY_RUN && legacyCommunityRoles) {
    await roles.updateMany(roleFilter, { $set: { roleScope: 'COMMUNITY_STAFF', isTenantRole: false } });
  }

  const unitRoleIds = (await roles.find({ roleScope: 'STAFF' }, { projection: { _id: 1 } }).toArray()).map((r) => r._id);
  const unitMembers = await memberships
    .find(
      { $or: [{ roleId: { $in: unitRoleIds } }, { roleIds: { $in: unitRoleIds } }] },
      { projection: { userId: 1, orgId: 1 } }
    )
    .toArray();

  let unit = 0;
  for (const m of unitMembers) {
    const filter = { orgId: m.orgId, userId: m.userId, staffCategory: { $exists: false } };
    if (DRY_RUN) unit += await technicians.countDocuments(filter);
    else unit += (await technicians.updateMany(filter, { $set: { staffCategory: 'UNIT', communityOnly: false } })).modifiedCount;
  }

  const restFilter = { staffCategory: { $exists: false } };
  const community = DRY_RUN
    ? await technicians.countDocuments(restFilter)
    : (await technicians.updateMany(restFilter, { $set: { staffCategory: 'COMMUNITY', communityOnly: false } })).modifiedCount;

  console.log(`${DRY_RUN ? '[dry run] ' : ''}Staff set to UNIT: ${unit}, set to COMMUNITY: ${community}`);
  await mongoose.disconnect();
}

migrate().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
