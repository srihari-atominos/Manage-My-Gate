/**
 * Read-only report to run before switching password sign-in off
 * (AUTH_PASSWORD_ENABLED=false). It changes nothing.
 *
 *   node scripts/auth-migration-report.mjs            # summary
 *   node scripts/auth-migration-report.mjs --details  # plus one line per affected account
 *
 * Sections
 *  1. Active accounts that could not sign in without a password: no deliverable
 *     email (missing or placeholder like @community.local / @staff.local) and no phone.
 *     An admin must add a real email or phone for each before the switch.
 *  2. Users with no community membership at all (e.g. created by the onboarding
 *     import, which never created memberships). They would land on "not part of a
 *     community yet"; their unit's community is shown where it can be resolved.
 *  3. Invited placeholders ("Pending Verification") with no live invitation:
 *     they can never activate; re-invite or remove them.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const PLACEHOLDER_EMAIL = /@(community|staff)\.local$/i;
const details = process.argv.includes('--details');

const mask = (email) => {
  if (!email) return '(none)';
  const [name, domain] = String(email).split('@');
  return `${name.slice(0, 2)}***@${domain || ''}`;
};

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const memberships = db.collection('orgmemberships');
  const tokens = db.collection('tokens');
  const villas = db.collection('villas');

  // 1. Cannot sign in without a password
  const noSignInChannel = await users
    .find({
      status: 'Active',
      $and: [
        { $or: [{ email: { $exists: false } }, { email: null }, { email: '' }, { email: PLACEHOLDER_EMAIL }] },
        { $or: [{ phone: { $exists: false } }, { phone: null }, { phone: '' }] },
      ],
    })
    .project({ email: 1, name: 1 })
    .toArray();

  // 2. No membership at all
  const withMembership = new Set((await memberships.distinct('userId')).map(String));
  const allUsers = await users
    .find({ status: { $in: ['Active', 'Pending Verification'] } })
    .project({ email: 1, villaId: 1, status: 1 })
    .toArray();
  const noMembership = allUsers.filter((u) => !withMembership.has(String(u._id)));
  for (const u of noMembership) {
    if (u.villaId) {
      const villa = await villas.findOne({ _id: u.villaId }, { projection: { organisationId: 1, orgId: 1 } });
      u.resolvedOrgId = villa?.organisationId || villa?.orgId || null;
    }
  }

  // 3. Placeholders that can never activate
  const placeholders = await users.find({ status: 'Pending Verification' }).project({ email: 1 }).toArray();
  const now = new Date();
  const orphanPlaceholders = [];
  for (const p of placeholders) {
    const live = await tokens.findOne({ userId: p._id, type: 'INVITATION', status: 'PENDING', expiresAt: { $gt: now } });
    if (!live) orphanPlaceholders.push(p);
  }

  console.log('Auth migration report (read-only)\n');
  console.log(`1. Active accounts with no email or phone to sign in with: ${noSignInChannel.length}`);
  if (details) noSignInChannel.forEach((u) => console.log(`   - ${u._id}  ${mask(u.email)}  ${u.name || ''}`));
  console.log(`2. Users without any community membership: ${noMembership.length}` +
    ` (unit community resolvable for ${noMembership.filter((u) => u.resolvedOrgId).length})`);
  if (details) noMembership.forEach((u) => console.log(`   - ${u._id}  ${mask(u.email)}  status=${u.status}  community=${u.resolvedOrgId || '?'}`));
  console.log(`3. Invited placeholders with no live invitation: ${orphanPlaceholders.length}`);
  if (details) orphanPlaceholders.forEach((u) => console.log(`   - ${u._id}  ${mask(u.email)}`));

  const blocking = noSignInChannel.length;
  console.log(`\n${blocking === 0 ? 'No blocking issues.' : `${blocking} account(s) must get an email or phone before AUTH_PASSWORD_ENABLED=false.`}`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
