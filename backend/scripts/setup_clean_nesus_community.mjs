import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const { default: config } = await import(`file://${path.join(backendRoot, 'src/config/config.js')}`);
const { syncPermissions } = await import(`file://${path.join(backendRoot, 'src/utils/permissionSync.util.js')}`);
const { DEFAULT_ROLE_PERMISSIONS } = await import(`file://${path.join(backendRoot, 'src/features/organization/defaultRolePermissions.js')}`);
const { expandFeatureKeys } = await import(`file://${path.join(backendRoot, 'src/features/organization/organization.services.js')}`);
const { DEFAULT_MODULES } = await import(`file://${path.join(backendRoot, 'src/features/workspace/workspace.service.js')}`);

const PLATFORM_ADMIN_EMAIL = 'naveen@atominosconsulting.com';
const COMMUNITY_ADMIN_EMAIL = 'naveenpv5886@gmail.com';
const COMMUNITY_NAME = 'Nesus Community';
const DEFAULT_PASSWORD = 'Test@1234';

async function setup() {
  console.log(`[CLEANUP] Connecting to MongoDB: ${config.mongodb.uri}`);
  await mongoose.connect(config.mongodb.uri);
  console.log('[CLEANUP] Connected successfully!');

  // 1. Sync permissions & Platform Super Admin baseline
  console.log('[CLEANUP] Running syncPermissions()...');
  await syncPermissions();

  const db = mongoose.connection.db;

  // 2. Identify Platform Organization ("System Platform", isPlatform: true)
  const Organization = (await import(`file://${path.join(backendRoot, 'src/features/organization/organization.model.js')}`)).default;
  const Role = (await import(`file://${path.join(backendRoot, 'src/features/role/role.model.js')}`)).default;
  const RolePermission = (await import(`file://${path.join(backendRoot, 'src/features/rolePermission/rolePermission.model.js')}`)).default;
  const Permission = (await import(`file://${path.join(backendRoot, 'src/features/permission/permission.model.js')}`)).default;
  const User = (await import(`file://${path.join(backendRoot, 'src/features/user/user.model.js')}`)).default;
  const OrgMembership = (await import(`file://${path.join(backendRoot, 'src/features/orgMembership/orgMembership.model.js')}`)).default;
  const Workspace = (await import(`file://${path.join(backendRoot, 'src/features/workspace/workspace.model.js')}`)).default;

  let platformOrg = await Organization.findOne({ isPlatform: true, name: 'System Platform' });
  if (!platformOrg) {
    platformOrg = await Organization.findOne({ isPlatform: true });
  }
  if (!platformOrg) {
    platformOrg = await Organization.create({
      name: 'System Platform',
      isPlatform: true,
      status: 'Active',
      organizationType: 'Other',
    });
  }
  console.log(`[CLEANUP] Platform Organization: ${platformOrg.name} (${platformOrg._id})`);

  // Ensure Platform Super Admin role exists
  let superAdminRole = await Role.findOne({ orgId: platformOrg._id, name: 'Platform Super Admin' });
  if (!superAdminRole) {
    superAdminRole = await Role.findOne({ orgId: platformOrg._id, name: 'Super Admin' });
  }
  if (!superAdminRole) {
    superAdminRole = await Role.create({
      name: 'Platform Super Admin',
      description: 'System-wide Super Administrator role with full access permissions.',
      orgId: platformOrg._id,
      isTenantRole: false,
    });
  }

  // 3. Delete all other organizations except platformOrg
  const deletedOrgs = await Organization.deleteMany({ _id: { $ne: platformOrg._id } });
  console.log(`[CLEANUP] Deleted ${deletedOrgs.deletedCount} old communities / organizations.`);

  // 4. Create password hash for default password
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // 5. Setup Platform Admin user
  let platformUser = await User.findOne({ email: PLATFORM_ADMIN_EMAIL });
  if (!platformUser) {
    platformUser = await User.create({
      email: PLATFORM_ADMIN_EMAIL,
      username: 'superadmin',
      name: 'Naveen',
      phone: '+919847561230',
      password: hashedPassword,
      status: 'Active',
      credentialStatus: 'INITIALIZED',
      emailVerified: true,
      phoneVerified: true,
      roles: [superAdminRole._id],
      lastActiveOrgId: platformOrg._id,
      residencyType: 'None',
    });
    console.log(`[CLEANUP] Created platform admin user: ${platformUser.email}`);
  } else {
    platformUser.name = 'Naveen';
    platformUser.username = platformUser.username || 'superadmin';
    platformUser.phone = platformUser.phone || '+919847561230';
    platformUser.password = hashedPassword;
    platformUser.status = 'Active';
    platformUser.credentialStatus = 'INITIALIZED';
    platformUser.emailVerified = true;
    platformUser.phoneVerified = true;
    platformUser.roles = [superAdminRole._id];
    platformUser.lastActiveOrgId = platformOrg._id;
    platformUser.villaId = null;
    platformUser.residencyType = 'None';
    await platformUser.save();
    console.log(`[CLEANUP] Updated platform admin user: ${platformUser.email}`);
  }

  // 6. Setup Community Admin user
  let communityUser = await User.findOne({ email: COMMUNITY_ADMIN_EMAIL });
  if (!communityUser) {
    communityUser = await User.create({
      email: COMMUNITY_ADMIN_EMAIL,
      username: 'Naveen',
      name: 'Naveen PV',
      phone: '+919786608686',
      password: hashedPassword,
      status: 'Active',
      credentialStatus: 'INITIALIZED',
      emailVerified: true,
      phoneVerified: true,
      roles: [],
      residencyType: 'None',
    });
    console.log(`[CLEANUP] Created community admin user: ${communityUser.email}`);
  } else {
    communityUser.name = 'Naveen PV';
    communityUser.username = communityUser.username || 'Naveen';
    communityUser.phone = communityUser.phone || '+919786608686';
    communityUser.password = hashedPassword;
    communityUser.status = 'Active';
    communityUser.credentialStatus = 'INITIALIZED';
    communityUser.emailVerified = true;
    communityUser.phoneVerified = true;
    communityUser.villaId = null;
    communityUser.residencyType = 'None';
    await communityUser.save();
    console.log(`[CLEANUP] Updated community admin user: ${communityUser.email}`);
  }

  // 7. Delete all other users!
  const deletedUsers = await User.deleteMany({
    _id: { $nin: [platformUser._id, communityUser._id] }
  });
  console.log(`[CLEANUP] Deleted ${deletedUsers.deletedCount} other users. Total users remaining: 2.`);

  // 8. Create the single community: Nesus Community
  const allowedFeatures = ['billing', 'villas', 'visitor', 'complaints', 'amenities', 'notices', 'administration_security', 'staff_management', 'digital_wallet'];
  const nesusCommunity = await Organization.create({
    name: COMMUNITY_NAME,
    status: 'Active',
    organizationType: 'Residential',
    contactEmail: COMMUNITY_ADMIN_EMAIL,
    contactPhone: '+919786608686',
    country: 'India',
    countryCode: 'IN',
    state: 'Tamil Nadu',
    city: 'Chennai',
    timezone: 'Asia/Kolkata',
    allowedFeatures,
    isPlatform: false,
    onboardingMode: 'INVITATION',
    authenticationMethod: 'EXISTING_SYSTEM',
  });
  console.log(`[CLEANUP] Created Community: ${nesusCommunity.name} (${nesusCommunity._id})`);

  // Update Community User lastActiveOrgId
  communityUser.lastActiveOrgId = nesusCommunity._id;

  // 9. Create standard roles for Nesus Community
  console.log('[CLEANUP] Creating community roles...');
  const roleAdmin = await Role.create({
    name: 'Community Admin',
    description: 'Gated community administrator with full access privileges.',
    orgId: nesusCommunity._id,
    isTenantRole: false,
  });

  const roleOwner = await Role.create({
    name: 'Resident Owner',
    description: 'Villa Owner residing in the community.',
    orgId: nesusCommunity._id,
    isTenantRole: true,
  });

  const roleTenant = await Role.create({
    name: 'Resident Tenant',
    description: 'Villa Tenant residing in the community.',
    orgId: nesusCommunity._id,
    isTenantRole: true,
  });

  const roleFamily = await Role.create({
    name: 'Family Member',
    description: 'Family member of a resident.',
    orgId: nesusCommunity._id,
    isTenantRole: true,
  });

  const roleGuard = await Role.create({
    name: 'Security Guard',
    description: 'Security gate staff.',
    orgId: nesusCommunity._id,
    isTenantRole: false,
  });

  const roleCommStaff = await Role.create({
    name: 'Community Staff',
    description: 'Community Staff (Global Staff): community complaints, maintenance, gate pass and attendance.',
    orgId: nesusCommunity._id,
    isTenantRole: false,
    roleScope: 'COMMUNITY_STAFF',
  });

  const roleHouseStaff = await Role.create({
    name: 'Household Staff',
    description: 'Unit Staff (Internal Staff): works only on units allocated by residents.',
    orgId: nesusCommunity._id,
    isTenantRole: true,
    roleScope: 'STAFF',
  });

  // 10. Map permissions to roles
  const allPermissions = await Permission.find({}).lean();
  const getPermissionIds = (names) =>
    allPermissions.filter((p) => names.includes(p.name)).map((p) => p._id);

  // Community Admin gets all expanded permissions for allowedFeatures + core admin
  const grantedFeatures = expandFeatureKeys(allowedFeatures);
  const adminPermIds = allPermissions
    .filter((p) => grantedFeatures.has(p.feature))
    .map((p) => p._id);

  // Link permissions to Community Admin
  const adminRolePermDocs = adminPermIds.map((pId) => ({
    roleId: roleAdmin._id,
    permissionId: pId,
  }));
  await RolePermission.insertMany(adminRolePermDocs);

  // Link permissions to other community roles
  const mapRolePerms = async (role, permNames) => {
    const ids = getPermissionIds(permNames);
    if (ids.length > 0) {
      await RolePermission.insertMany(ids.map((pId) => ({ roleId: role._id, permissionId: pId })));
    }
  };

  await mapRolePerms(roleOwner, DEFAULT_ROLE_PERMISSIONS['Resident Owner'] || []);
  await mapRolePerms(roleTenant, DEFAULT_ROLE_PERMISSIONS['Resident Tenant'] || []);
  await mapRolePerms(roleFamily, DEFAULT_ROLE_PERMISSIONS['Family Member'] || []);
  await mapRolePerms(roleGuard, DEFAULT_ROLE_PERMISSIONS['Security Guard'] || []);
  await mapRolePerms(roleCommStaff, DEFAULT_ROLE_PERMISSIONS['Community Staff'] || []);
  await mapRolePerms(roleHouseStaff, DEFAULT_ROLE_PERMISSIONS['Household Staff'] || []);

  console.log('[CLEANUP] Successfully mapped permissions to community roles.');

  // Clean up any orphan roles and rolepermissions from old deleted orgs
  const validOrgIds = [platformOrg._id, nesusCommunity._id];
  const orphanRoles = await Role.find({ orgId: { $nin: validOrgIds } });
  const orphanRoleIds = orphanRoles.map((r) => r._id);
  await RolePermission.deleteMany({ roleId: { $in: orphanRoleIds } });
  await Role.deleteMany({ _id: { $in: orphanRoleIds } });
  console.log(`[CLEANUP] Removed ${orphanRoles.length} orphaned roles and their permission mappings.`);

  // 11. Update communityUser roles
  communityUser.roles = [roleAdmin._id];
  await communityUser.save();

  // 12. Create Workspace for Nesus Community
  await Workspace.deleteMany({});
  const workspace = await Workspace.create({
    workspaceName: COMMUNITY_NAME,
    organizationId: nesusCommunity._id,
    organizationName: COMMUNITY_NAME,
    createdBy: communityUser._id,
    modules: DEFAULT_MODULES,
    status: 'Active',
    activityLogs: [
      {
        action: 'Workspace Created',
        performedBy: communityUser._id,
        details: `Workspace "${COMMUNITY_NAME}" created.`,
      },
    ],
  });
  console.log(`[CLEANUP] Created Workspace: ${workspace.workspaceName} (${workspace._id})`);

  // 13. Recreate OrgMemberships
  await OrgMembership.deleteMany({});
  await OrgMembership.create([
    {
      userId: platformUser._id,
      orgId: platformOrg._id,
      roleId: superAdminRole._id,
      roleIds: [superAdminRole._id],
      residentType: 'None',
      status: 'Active',
    },
    {
      userId: communityUser._id,
      orgId: nesusCommunity._id,
      roleId: roleAdmin._id,
      roleIds: [roleAdmin._id],
      residentType: 'None',
      status: 'Active',
    },
  ]);
  console.log('[CLEANUP] Created clean OrgMemberships for Platform Admin and Community Admin.');

  // 14. Purge all orphaned/stale records in all community-scoped collections
  const collectionsToClean = [
    'villas',
    'amenities',
    'amenity_management_facilities',
    'amenity_management_settings',
    'amenity_management_reservations',
    'amenity_management_outbox_events',
    'amenity_management_idempotency_records',
    'amenity_management_counters',
    'amenity_management_slot_allocations',
    'amenity_management_maintenance_impacts',
    'amenity_management_reservation_holds',
    'amenity_management_resources',
    'amenity_management_maintenance_blocks',
    'amenity_management_access_passes',
    'amenity_management_quota_allocations',
    'amenitybookings',
    'bookings',
    'notices',
    'noticeacknowledgements',
    'noticecomments',
    'noticereactions',
    'noticeversions',
    'complaints',
    'complaintsettings',
    'invoices',
    'invoicesequences',
    'financial_ledger_entries',
    'expenses',
    'expensepayments',
    'payments',
    'paymentallocations',
    'paymenttransactions',
    'reconciliation_exceptions',
    'billingschedules',
    'ledgers',
    'wallets',
    'wallettransactions',
    'walletledgers',
    'visitorpasses',
    'visitorlogs',
    'visitorpasstokens',
    'staffunitassociations',
    'staffattendances',
    'technicians',
    'staffnotifications',
    'integrationhubs',
    'conversations',
    'messages',
    'communitynotes',
    'enquiries',
    'enquiryactivities',
    'enquirystagehistories',
    'crminquiries',
    'crmthreads',
    'crmtasks',
    'crmmeetings',
    'platformorders',
    'platforminvoices',
    'platformquotes',
    'platformsubscriptions',
    'platformentitlements',
    'provisioningworkflows',
    'quoteapprovals',
    'quotetimelines',
    'ordertimelines',
    'orderamendments',
    'renewaljobs',
    'activationexecutions',
    'aiassistantactions',
    'issue_reports',
    'issue_report_configs',
    'issue_report_sequences',
    'polls',
    'pollvotes',
    'pollreactions',
    'sessions',
    'tokens',
    'otps',
    'otpthrottles',
    'devicetokens',
    'auditlogs',
    'securitylogs',
    'outboxevents',
    'platformpaymentoutboxevents',
  ];

  for (const colName of collectionsToClean) {
    try {
      const col = db.collection(colName);
      const res = await col.deleteMany({});
      if (res.deletedCount > 0) {
        console.log(`[CLEANUP] Emptied ${colName}: deleted ${res.deletedCount} records.`);
      }
    } catch (err) {
      // Collection may not exist yet, safe to ignore
    }
  }

  // Clean useridentities and userpreferences for anyone not in the 2 users
  await db.collection('useridentities').deleteMany({ userId: { $nin: [platformUser._id, communityUser._id] } });
  await db.collection('userpreferences').deleteMany({ userId: { $nin: [platformUser._id, communityUser._id] } });

  console.log('\n================== DATABASE STATUS SUMMARY ==================');
  const orgCount = await Organization.countDocuments();
  const userCount = await User.countDocuments();
  const membershipCount = await OrgMembership.countDocuments();
  const workspaceCount = await Workspace.countDocuments();
  const roleCount = await Role.countDocuments();

  console.log(`Organizations (${orgCount}):`);
  const allOrgs = await Organization.find({}).lean();
  allOrgs.forEach((o) => console.log(`  - ${o.name} (isPlatform: ${o.isPlatform})`));

  console.log(`\nUsers (${userCount}):`);
  const allUsers = await User.find({}).lean();
  allUsers.forEach((u) => console.log(`  - ${u.name} <${u.email}> (username: ${u.username}, phone: ${u.phone})`));

  console.log(`\nWorkspaces (${workspaceCount}):`);
  const allWorkspaces = await Workspace.find({}).lean();
  allWorkspaces.forEach((w) => console.log(`  - ${w.workspaceName} (orgId: ${w.organizationId})`));

  console.log(`\nMemberships (${membershipCount}):`);
  const allMemberships = await OrgMembership.find({}).populate('userId orgId roleId').lean();
  allMemberships.forEach((m) =>
    console.log(`  - User: ${m.userId?.email} -> Org: ${m.orgId?.name} [Role: ${m.roleId?.name}]`)
  );

  console.log('\n============================================================');
  console.log('Credentials:');
  console.log(`Platform Admin  : ${PLATFORM_ADMIN_EMAIL}  | Password: ${DEFAULT_PASSWORD}`);
  console.log(`Community Admin : ${COMMUNITY_ADMIN_EMAIL} | Password: ${DEFAULT_PASSWORD}`);
  console.log(`Community Name  : ${COMMUNITY_NAME}`);
  console.log('============================================================\n');
}

setup()
  .catch((err) => {
    console.error('[CLEANUP ERROR]:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('[CLEANUP] Disconnected from database.');
  });
