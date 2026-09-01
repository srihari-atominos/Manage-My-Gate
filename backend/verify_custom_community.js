import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/database_name';

// Import Models to register schemas
import './src/features/permission/permission.model.js';
import './src/features/rolePermission/rolePermission.model.js';
import './src/features/villa/villa.model.js';

import Organization from './src/features/organization/organization.model.js';
import Workspace from './src/features/workspace/workspace.model.js';
import User from './src/features/user/user.model.js';
import Role from './src/features/role/role.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import { getPermissionsForUser } from './src/middlewares/rbac.middleware.js';

async function verify() {
  console.log(`[VERIFY] Connecting to database: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('[VERIFY] Connected successfully!');

  const ORG_NAME = 'Springdale Garden Community';
  const org = await Organization.findOne({ name: ORG_NAME });
  if (!org) {
    console.error(`[VERIFY] Organization "${ORG_NAME}" not found in database.`);
    process.exit(1);
  }
  console.log(`[VERIFY] Found Organization: ${org.name} (ID: ${org._id})`);

  const workspace = await Workspace.findOne({ organizationId: org._id });
  if (!workspace) {
    console.error(`[VERIFY] Workspace for Organization "${org.name}" not found.`);
  } else {
    console.log(`[VERIFY] Found Workspace: ${workspace.workspaceName} (ID: ${workspace._id})`);
    console.log(`[VERIFY] Enabled modules in workspace: ${workspace.modules.filter(m => m.enabled).map(m => m.moduleName).join(', ')}`);
  }

  console.log('\n====================== SEEDED ROLES ======================');
  const roles = await Role.find({ orgId: org._id });
  for (const r of roles) {
    console.log(`- Role: "${r.name}" (ID: ${r._id}) - Description: "${r.description}"`);
  }

  console.log('\n====================== SEEDED USERS ======================');
  const userEmails = [
    'springdale_admin@example.com',
    'springdale_owner1@example.com',
    'springdale_owner2@example.com',
    'springdale_tenant1@example.com',
    'springdale_guard1@example.com'
  ];

  const users = await User.find({ email: { $in: userEmails } });
  
  for (const user of users) {
    const membership = await OrgMembership.findOne({ userId: user._id, orgId: org._id })
      .populate('roleId')
      .populate('roleIds')
      .populate({ path: 'units.villaId', select: 'unitNumber blockOrBuilding status' })
      .populate({ path: 'villaId', select: 'unitNumber blockOrBuilding status' });

    console.log(`\nUser: ${user.name} (${user.username})`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phone}`);
    console.log(`  Status: ${user.status}`);
    
    if (membership) {
      console.log(`  Membership status: ${membership.status}`);
      console.log(`  Primary Role: ${membership.roleId ? membership.roleId.name : 'None'}`);
      console.log(`  All Associated Roles (roleIds): ${membership.roleIds ? membership.roleIds.map(r => r.name).join(', ') : 'None'}`);
      
      if (membership.units && membership.units.length > 0) {
        console.log(`  Units:`);
        membership.units.forEach(unit => {
          if (unit.villaId) {
            console.log(`    - Unit ${unit.villaId.unitNumber} (${unit.villaId.blockOrBuilding}) - Status: ${unit.villaId.status} - Resident Type: ${unit.residentType}`);
          }
        });
      } else if (membership.villaId) {
        console.log(`  Villa: Unit ${membership.villaId.unitNumber} (${membership.villaId.blockOrBuilding}) - Status: ${membership.villaId.status}`);
      }
    } else {
      console.log(`  Membership: None`);
    }

    // Prepare custom req.user object to test rbac.middleware's getPermissionsForUser
    const reqUser = {
      id: user._id,
      email: user.email,
      username: user.username,
      role: membership?.roleId?.name || 'None',
      roleId: membership?.roleId?._id || null,
      roleIds: membership?.roleIds ? membership.roleIds.map(r => r._id) : [],
      orgId: org._id
    };

    const permissions = await getPermissionsForUser(reqUser);
    console.log(`  Total permissions: ${permissions.length}`);
    
    if (user.username === 'springdale_owner1') {
      console.log(`  Permissions List for Amit Patel:`);
      const sortedPerms = permissions.sort();
      console.log(`    Notice Board Management (from Board Member role): ${sortedPerms.includes('notices:manage_notices') ? '✅ YES' : '❌ NO'}`);
      console.log(`    Complaint Assignment (from Board Member role): ${sortedPerms.includes('complaints:assign') ? '✅ YES' : '❌ NO'}`);
      console.log(`    Visitor Resident (from Resident Owner role): ${sortedPerms.includes('visitor:resident') ? '✅ YES' : '❌ NO'}`);
      console.log(`    (Total matching perms: ${sortedPerms.filter(p => p.startsWith('notices') || p.startsWith('complaints') || p.startsWith('visitor')).join(', ')})`);
    } else if (user.username === 'springdale_owner2') {
      console.log(`  Permissions List for Suresh Raina:`);
      const sortedPerms = permissions.sort();
      console.log(`    Billing Assessment Manager (from Treasurer role): ${sortedPerms.includes('billing:assessment_manager') ? '✅ YES' : '❌ NO'}`);
      console.log(`    Visitor Resident (from Resident Owner role): ${sortedPerms.includes('visitor:resident') ? '✅ YES' : '❌ NO'}`);
      console.log(`    (Total matching perms: ${sortedPerms.filter(p => p.startsWith('billing') || p.startsWith('visitor')).join(', ')})`);
    }
  }

  await mongoose.disconnect();
}

verify().catch((err) => {
  console.error('[VERIFY] Error during verification:', err);
  process.exit(1);
});
