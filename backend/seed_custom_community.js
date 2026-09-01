import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/database_name';

// Import Models
import Organization from './src/features/organization/organization.model.js';
import Workspace from './src/features/workspace/workspace.model.js';
import User from './src/features/user/user.model.js';
import Role from './src/features/role/role.model.js';
import Villa from './src/features/villa/villa.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Permission from './src/features/permission/permission.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';
import { DEFAULT_MODULES } from './src/features/workspace/workspace.service.js';

async function seed() {
  console.log(`[SEED] Connecting to database: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('[SEED] Connected successfully!');

  const ORG_NAME = 'Springdale Garden Community';
  const EMAILS = [
    'springdale_admin@example.com',
    'springdale_owner1@example.com',
    'springdale_owner2@example.com',
    'springdale_tenant1@example.com',
    'springdale_guard1@example.com'
  ];

  // --- 1. Clean Up Previous Runs ---
  console.log('[SEED] Cleaning up previous seed data for Springdale...');
  
  // Find organization if it exists
  const existingOrg = await Organization.findOne({ name: ORG_NAME });
  if (existingOrg) {
    const orgId = existingOrg._id;
    // Delete memberships
    const deletedMemberships = await OrgMembership.deleteMany({ orgId });
    console.log(`[SEED] Deleted ${deletedMemberships.deletedCount} memberships.`);
    // Delete villas
    const deletedVillas = await Villa.deleteMany({ orgId });
    console.log(`[SEED] Deleted ${deletedVillas.deletedCount} villas.`);
    // Delete roles and their permission mappings
    const roles = await Role.find({ orgId });
    const roleIds = roles.map(r => r._id);
    await RolePermission.deleteMany({ roleId: { $in: roleIds } });
    const deletedRoles = await Role.deleteMany({ orgId });
    console.log(`[SEED] Deleted ${deletedRoles.deletedCount} roles and their permission mappings.`);
    // Delete workspace
    const deletedWorkspaces = await Workspace.deleteMany({ organizationId: orgId });
    console.log(`[SEED] Deleted ${deletedWorkspaces.deletedCount} workspaces.`);
    // Delete organization
    await Organization.deleteOne({ _id: orgId });
    console.log(`[SEED] Deleted organization: ${ORG_NAME}`);
  }

  // Delete users by email
  const deletedUsers = await User.deleteMany({ email: { $in: EMAILS } });
  console.log(`[SEED] Deleted ${deletedUsers.deletedCount} user accounts.`);
  console.log('[SEED] Clean up complete.');

  // --- 2. Create Organization / Community ---
  console.log('[SEED] Creating Organization...');
  const org = await Organization.create({
    name: ORG_NAME,
    status: 'Active',
    organizationType: 'Residential',
    allowedFeatures: ['billing', 'villas', 'visitor', 'complaints', 'amenities', 'notices'],
    isPlatform: false
  });
  console.log(`[SEED] Created Organization: ${org.name} (${org._id})`);

  // --- 3. Create Roles ---
  console.log('[SEED] Creating Roles...');
  const roleAdmin = await Role.create({
    name: 'Community Admin',
    orgId: org._id,
    description: 'Community Administrator with full access',
    isTenantRole: false
  });

  const roleOwner = await Role.create({
    name: 'Resident Owner',
    orgId: org._id,
    description: 'Villa Owner residing in the community',
    isTenantRole: true
  });

  const roleTenant = await Role.create({
    name: 'Resident Tenant',
    orgId: org._id,
    description: 'Tenant renting a villa in the community',
    isTenantRole: true
  });

  const roleGuard = await Role.create({
    name: 'Security Guard',
    orgId: org._id,
    description: 'Security Guard patrolling the community gates',
    isTenantRole: false
  });

  // Custom roles to demonstrate multiple roles assignment
  const roleBoardMember = await Role.create({
    name: 'Board Member',
    orgId: org._id,
    description: 'Member of the Resident Management Board',
    isTenantRole: false
  });

  const roleTreasurer = await Role.create({
    name: 'Treasurer',
    orgId: org._id,
    description: 'Treasurer in charge of community financials and billing',
    isTenantRole: false
  });

  console.log('[SEED] Roles created successfully.');

  // --- 4. Setup Role Permissions ---
  console.log('[SEED] Mapping Permissions to Roles...');
  const allPermissions = await Permission.find({});
  console.log(`[SEED] Found ${allPermissions.length} total permissions in the database.`);

  const mappings = [];

  // Helper function to map a set of permissions by name
  const mapPermissionsToRole = async (roleId, permissionNames) => {
    const matchedPerms = allPermissions.filter(p => permissionNames.includes(p.name));
    for (const perm of matchedPerms) {
      mappings.push({
        roleId,
        permissionId: perm._id
      });
    }
  };

  // Community Admin: gets ALL permissions
  for (const perm of allPermissions) {
    mappings.push({
      roleId: roleAdmin._id,
      permissionId: perm._id
    });
  }

  // Resident Owner & Tenant permissions
  const residentPermNames = [
    'visitor:resident',
    'villas:read',
    'users:read',
    'roles:read',
    'amenities:discover',
    'amenities:my_booking',
    'amenities:wallet',
    'complaints:create',
    'complaints:view',
    'complaints:timeline',
    'complaints:comments',
    'notices:active_board',
    'notices:polls',
    'billing:action_center'
  ];
  await mapPermissionsToRole(roleOwner._id, residentPermNames);
  await mapPermissionsToRole(roleTenant._id, residentPermNames);

  // Security Guard permissions
  const guardPermNames = [
    'visitor:guard',
    'villas:read',
    'users:read',
    'amenities:scanner',
    'amenities:security_logs'
  ];
  await mapPermissionsToRole(roleGuard._id, guardPermNames);

  // Board Member: gets Resident permissions + Notice & Complaint Management
  const boardPermNames = [
    ...residentPermNames,
    'notices:manage_notices',
    'notices:dashboard',
    'complaints:assign',
    'complaints:update',
    'complaints:dashboard'
  ];
  await mapPermissionsToRole(roleBoardMember._id, boardPermNames);

  // Treasurer: gets Resident permissions + Billing Management
  const treasurerPermNames = [
    ...residentPermNames,
    'billing:dashboard',
    'billing:assessment_manager'
  ];
  await mapPermissionsToRole(roleTreasurer._id, treasurerPermNames);

  // Bulk write RolePermissions
  if (mappings.length > 0) {
    await RolePermission.insertMany(mappings);
    console.log(`[SEED] Successfully mapped ${mappings.length} role-permission entries.`);
  }

  // --- 5. Hash Password & Create Users ---
  console.log('[SEED] Creating Users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  // User 1: Community Admin
  const adminUser = await User.create({
    email: 'springdale_admin@example.com',
    username: 'springdale_admin',
    password: passwordHash,
    status: 'Active',
    name: 'Springdale Admin',
    phone: '+918888888801',
    roles: [roleAdmin._id],
    residencyType: 'None'
  });

  // User 2: Resident Owner + Board Member (Multiple Roles!)
  const owner1User = await User.create({
    email: 'springdale_owner1@example.com',
    username: 'springdale_owner1',
    password: passwordHash,
    status: 'Active',
    name: 'Amit Patel (Owner & Board Member)',
    phone: '+918888888802',
    roles: [roleOwner._id, roleBoardMember._id],
    residencyType: 'Resident Owner'
  });

  // User 3: Resident Owner + Treasurer (Multiple Roles!)
  const owner2User = await User.create({
    email: 'springdale_owner2@example.com',
    username: 'springdale_owner2',
    password: passwordHash,
    status: 'Active',
    name: 'Suresh Raina (Owner & Treasurer)',
    phone: '+918888888803',
    roles: [roleOwner._id, roleTreasurer._id],
    residencyType: 'Resident Owner'
  });

  // User 4: Resident Tenant
  const tenant1User = await User.create({
    email: 'springdale_tenant1@example.com',
    username: 'springdale_tenant1',
    password: passwordHash,
    status: 'Active',
    name: 'Vikram Malhotra (Tenant)',
    phone: '+918888888804',
    roles: [roleTenant._id],
    residencyType: 'Tenant'
  });

  // User 5: Security Guard
  const guardUser = await User.create({
    email: 'springdale_guard1@example.com',
    username: 'springdale_guard1',
    password: passwordHash,
    status: 'Active',
    name: 'Ram Singh (Guard)',
    phone: '+918888888805',
    roles: [roleGuard._id],
    residencyType: 'Staff'
  });

  console.log('[SEED] Users created successfully.');

  // --- 6. Create Villas & Link to Users ---
  console.log('[SEED] Creating Villas & Links...');
  
  // Villa S-101: Owned & Occupied by Amit Patel (owner1User)
  const villaS101 = await Villa.create({
    orgId: org._id,
    unitNumber: 'Villa S-101',
    blockOrBuilding: 'Sector S',
    type: 'Villa',
    status: 'Occupied',
    primaryResidentId: owner1User._id,
    residents: [
      { userId: owner1User._id, residencyType: 'Resident Owner', isPrimary: true }
    ]
  });

  // Villa S-102: Owned by Suresh Raina (owner2User), Occupied by Vikram Malhotra (tenant1User)
  const villaS102 = await Villa.create({
    orgId: org._id,
    unitNumber: 'Villa S-102',
    blockOrBuilding: 'Sector S',
    type: 'Villa',
    status: 'Occupied',
    primaryResidentId: tenant1User._id,
    residents: [
      { userId: owner2User._id, residencyType: 'Non-Resident Owner', isPrimary: false },
      { userId: tenant1User._id, residencyType: 'Tenant', isPrimary: true }
    ]
  });

  // Update User documents with their villaId
  await User.updateOne({ _id: owner1User._id }, { $set: { villaId: villaS101._id } });
  await User.updateOne({ _id: tenant1User._id }, { $set: { villaId: villaS102._id } });
  await User.updateOne({ _id: owner2User._id }, { $set: { villaId: villaS102._id } }); // Linked to S-102 since they own it

  console.log('[SEED] Villas created and linked to users.');

  // --- 7. Create OrgMemberships with Multiple Roles mapped in roleIds ---
  console.log('[SEED] Creating OrgMemberships...');
  await OrgMembership.create([
    {
      userId: adminUser._id,
      orgId: org._id,
      roleId: roleAdmin._id,
      roleIds: [roleAdmin._id],
      status: 'Active',
      residentType: 'None'
    },
    {
      userId: owner1User._id,
      orgId: org._id,
      roleId: roleOwner._id,
      roleIds: [roleOwner._id, roleBoardMember._id], // Multiple Roles!
      villaId: villaS101._id,
      units: [{ villaId: villaS101._id, residentType: 'Resident Owner' }],
      status: 'Active',
      residentType: 'Owner'
    },
    {
      userId: owner2User._id,
      orgId: org._id,
      roleId: roleOwner._id,
      roleIds: [roleOwner._id, roleTreasurer._id], // Multiple Roles!
      villaId: villaS102._id,
      units: [{ villaId: villaS102._id, residentType: 'Non-Resident Owner' }],
      status: 'Active',
      residentType: 'Owner'
    },
    {
      userId: tenant1User._id,
      orgId: org._id,
      roleId: roleTenant._id,
      roleIds: [roleTenant._id],
      villaId: villaS102._id,
      units: [{ villaId: villaS102._id, residentType: 'Tenant' }],
      status: 'Active',
      residentType: 'Tenant'
    },
    {
      userId: guardUser._id,
      orgId: org._id,
      roleId: roleGuard._id,
      roleIds: [roleGuard._id],
      status: 'Active',
      residentType: 'None'
    }
  ]);

  console.log('[SEED] OrgMemberships created.');

  // --- 8. Create Workspace ---
  console.log('[SEED] Creating Workspace...');
  const workspace = await Workspace.create({
    workspaceName: `${ORG_NAME} Workspace`,
    name: `${ORG_NAME} Workspace`,
    organizationId: org._id,
    organizationName: org.name,
    status: 'Active',
    createdBy: adminUser._id,
    modules: DEFAULT_MODULES
  });
  console.log(`[SEED] Created Workspace: ${workspace.workspaceName} (${workspace._id})`);

  console.log('[SEED] Seeding successfully completed!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[SEED] Error during seeding:', err);
  process.exit(1);
});
