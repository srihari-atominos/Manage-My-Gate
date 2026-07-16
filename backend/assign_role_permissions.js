/**
 * ============================================================
 *  assign_role_permissions.js
 *  Assigns appropriate permissions to every role in the
 *  "Greenfield Heights Community" organisation so all
 *  sidebar features become visible after re-login.
 *
 *  Run: node assign_role_permissions.js
 * ============================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';
const ORG_NAME  = 'Greenfield Heights Community';

// ── Model Imports ──────────────────────────────────────────
import { Permission }     from './src/features/permission/permission.model.js';
import { RolePermission } from './src/features/rolePermission/rolePermission.model.js';
import Role               from './src/features/role/role.model.js';
import Organization       from './src/features/organization/organization.model.js';

// ── Permission Matrices per Role ──────────────────────────
// Format: 'feature:action'  (must exactly match permissions.json)

const ROLE_PERMISSIONS = {
  'Community Admin': [
    // Users
    'users:create', 'users:read', 'users:update', 'users:delete',
    // Roles
    'roles:create', 'roles:read', 'roles:update', 'roles:delete',
    // Villas
    'villas:create', 'villas:read', 'villas:update', 'villas:delete',
    // Integrations
    'integrations:create', 'integrations:read', 'integrations:update', 'integrations:delete',
    // Amenities — full admin access
    'amenities:dashboard', 'amenities:admin_calander', 'amenities:ledgers',
    'amenities:amenities', 'amenities:maintenance', 'amenities:settings',
    'amenities:scanner', 'amenities:security_logs',
    // Complaints — full management
    'complaints:view', 'complaints:create', 'complaints:update', 'complaints:delete',
    'complaints:assign', 'complaints:dashboard', 'complaints:reports',
    'complaints:calendar', 'complaints:settings', 'complaints:comments',
    'complaints:timeline', 'complaints:export', 'complaints:analytics',
    'complaints:staff', 'complaints:raise_ticket', 'complaints:track_requests',
    'complaints:complaint_management', 'complaints:assignee',
    // Visitor
    'visitor:admin', 'visitor:resident', 'visitor:guard',
    // Notices
    'notices:create', 'notices:read', 'notices:update', 'notices:delete',
  ],

  'Facility Manager': [
    // Villas — read only
    'villas:read',
    // Amenities — full admin operations
    'amenities:dashboard', 'amenities:admin_calander', 'amenities:ledgers',
    'amenities:amenities', 'amenities:maintenance', 'amenities:settings',
    'amenities:scanner', 'amenities:security_logs',
    // Complaints — full assignment/management
    'complaints:view', 'complaints:create', 'complaints:update',
    'complaints:assign', 'complaints:dashboard', 'complaints:reports',
    'complaints:calendar', 'complaints:settings', 'complaints:comments',
    'complaints:timeline', 'complaints:staff', 'complaints:track_requests',
    'complaints:complaint_management', 'complaints:assignee',
    // Notices
    'notices:create', 'notices:read', 'notices:update',
    // Visitor — admin view
    'visitor:admin',
  ],

  'Security Guard': [
    // Visitor — guard access (gate control, log scanning)
    'visitor:guard',
    // Notices — read only
    'notices:read',
    // Villas — read only
    'villas:read',
    // Complaints — submit and track only
    'complaints:raise_ticket', 'complaints:track_requests',
  ],

  'Resident Owner': [
    // Villas — read their own
    'villas:read',
    // Amenities — resident booking flow
    'amenities:discover', 'amenities:my_booking', 'amenities:wallet',
    // Complaints — raise + track tickets
    'complaints:raise_ticket', 'complaints:track_requests',
    'complaints:view', 'complaints:comments', 'complaints:timeline',
    // Visitor — create & manage passes
    'visitor:resident',
    // Notices — read
    'notices:read',
  ],

  'Resident Tenant': [
    // Villas — read their own
    'villas:read',
    // Amenities — resident booking flow
    'amenities:discover', 'amenities:my_booking', 'amenities:wallet',
    // Complaints — raise + track
    'complaints:raise_ticket', 'complaints:track_requests',
    'complaints:view', 'complaints:comments', 'complaints:timeline',
    // Visitor — create passes
    'visitor:resident',
    // Notices — read
    'notices:read',
  ],

  'Family Member': [
    // Notices — read only
    'notices:read',
    // Visitor — resident context for pass creation
    'visitor:resident',
    // Complaints — raise only
    'complaints:raise_ticket', 'complaints:track_requests',
  ],
};

async function run() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    Role-Permission Assignment Script     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB connected.\n');

  // 1. Load the org
  const org = await Organization.findOne({ name: ORG_NAME });
  if (!org) {
    console.error(`❌  Organization "${ORG_NAME}" not found. Run seed_full_flow.js first.`);
    process.exit(1);
  }
  console.log(`✔  Org found: ${org.name} [${org._id}]\n`);

  // 2. Load all Permission documents into a lookup map  name → _id
  const allPermissions = await Permission.find({}).lean();
  const permMap = {};
  for (const p of allPermissions) {
    permMap[p.name] = p._id;
  }
  console.log(`✔  Loaded ${allPermissions.length} permissions from DB.\n`);

  // 3. Load roles for this org
  const orgRoles = await Role.find({ orgId: org._id }).lean();
  console.log(`✔  Found ${orgRoles.length} roles in org.\n`);

  // 4. Assign permissions per role
  let totalMapped = 0;
  let totalSkipped = 0;

  for (const role of orgRoles) {
    const permNames = ROLE_PERMISSIONS[role.name];
    if (!permNames) {
      console.log(`⚠️   No permission matrix defined for role "${role.name}" — skipping.`);
      continue;
    }

    console.log(`⏳  Assigning ${permNames.length} permissions to "${role.name}"…`);

    // Remove existing mappings to avoid duplicates on re-run
    await RolePermission.deleteMany({ roleId: role._id });

    const mappings = [];
    for (const pName of permNames) {
      const permId = permMap[pName];
      if (!permId) {
        console.warn(`   ⚠️  Permission "${pName}" not found in DB — skipping.`);
        totalSkipped++;
        continue;
      }
      mappings.push({ roleId: role._id, permissionId: permId });
    }

    if (mappings.length > 0) {
      await RolePermission.insertMany(mappings, { ordered: false });
      console.log(`   ✔  Inserted ${mappings.length} mappings for "${role.name}".`);
      totalMapped += mappings.length;
    }
  }

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  DONE!  ${totalMapped} permissions assigned.           ║`);
  if (totalSkipped > 0) {
    console.log(`║  ⚠️  ${totalSkipped} unknown permission keys skipped.  ║`);
  }
  console.log(`╚══════════════════════════════════════════╝\n`);
  console.log('👉  Ask all test users to LOG OUT and LOG BACK IN');
  console.log('   so their JWT is refreshed with the new permissions.\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ FAILED:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
