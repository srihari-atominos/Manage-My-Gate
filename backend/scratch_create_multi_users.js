import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

import Organization from './src/features/organization/organization.model.js';
import Workspace from './src/features/workspace/workspace.model.js';
import User from './src/features/user/user.model.js';
import Role from './src/features/role/role.model.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const suffix = Math.floor(Math.random() * 1000);
  const orgName = 'Global Communities ' + suffix;
  const domain = 'globalcom' + suffix + '.com';

  // 1. Create Organization
  const org = await Organization.create({
    name: orgName,
    organizationType: 'Residential',
    status: 'Active'
  });
  console.log('Created Org:', org._id);

  // 2. Create Roles for the Org
  const adminRole = await Role.create({ name: 'Community Admin', orgId: org._id, isTenantRole: false });
  const ownerRole = await Role.create({ name: 'Resident Owner', orgId: org._id, isTenantRole: true });
  const tenantRole = await Role.create({ name: 'Resident Tenant', orgId: org._id, isTenantRole: true });
  const guardRole = await Role.create({ name: 'Security Guard', orgId: org._id, isTenantRole: false });
  console.log('Created Roles:', {
    admin: adminRole._id,
    owner: ownerRole._id,
    tenant: tenantRole._id,
    guard: guardRole._id
  });

  // 3. Create Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const adminUser = await User.create({
    email: `admin@${domain}`,
    username: `admin_${suffix}`,
    password: passwordHash,
    status: 'Active',
    name: 'Global Admin',
    roles: [adminRole._id],
    emailVerified: true,
    phoneVerified: true
  });

  const ownerUser = await User.create({
    email: `owner@${domain}`,
    username: `owner_${suffix}`,
    password: passwordHash,
    status: 'Active',
    name: 'Resident Owner User',
    roles: [ownerRole._id],
    emailVerified: true,
    phoneVerified: true
  });

  const tenantUser = await User.create({
    email: `tenant@${domain}`,
    username: `tenant_${suffix}`,
    password: passwordHash,
    status: 'Active',
    name: 'Resident Tenant User',
    roles: [tenantRole._id],
    emailVerified: true,
    phoneVerified: true
  });

  const guardUser = await User.create({
    email: `guard@${domain}`,
    username: `guard_${suffix}`,
    password: passwordHash,
    status: 'Active',
    name: 'Security Guard User',
    roles: [guardRole._id],
    emailVerified: true,
    phoneVerified: true
  });

  // 4. Create Workspace
  const workspace = await Workspace.create({
    workspaceName: orgName + ' Workspace',
    organizationId: org._id,
    status: 'Active',
    createdBy: adminUser._id,
    modules: [
      { moduleName: 'Visitor Management', moduleKey: 'visitor', route: '/visitor-management', icon: 'QrCode', displayOrder: 1, enabled: true },
      { moduleName: 'Administration & Security', moduleKey: 'administration_security', route: '/admin', icon: 'ShieldCheck', displayOrder: 2, enabled: true },
      { moduleName: 'Unit Management', moduleKey: 'villas', route: '/villas', icon: 'Home', displayOrder: 3, enabled: true },
      { moduleName: 'User Management', moduleKey: 'users', route: '/users', icon: 'People', displayOrder: 4, enabled: true },
      { moduleName: 'Role Builder', moduleKey: 'roles', route: '/role-builder', icon: 'LockLocked', displayOrder: 5, enabled: true },
      { moduleName: 'Amenities & Bookings', moduleKey: 'amenities', route: '/amenities', icon: 'Building', displayOrder: 6, enabled: true },
      { moduleName: 'Notice Board', moduleKey: 'notices', route: '/notices', icon: 'List', displayOrder: 7, enabled: true },
      { moduleName: 'Complaints / Maintenance', moduleKey: 'complaints', route: '/complaints', icon: 'Warning', displayOrder: 8, enabled: true },
      { moduleName: 'Billing & Invoices', moduleKey: 'billing', route: '/billing', icon: 'Speedometer', displayOrder: 9, enabled: true },
      { moduleName: 'Integration Hub', moduleKey: 'integrations', route: '/integrations', icon: 'Apps', displayOrder: 10, enabled: true }
    ]
  });

  console.log('\n--- DATASHEET ---');
  console.log('Org Name:', orgName);
  console.log('Workspace Name:', workspace.workspaceName);
  console.log('Password (All Users):', 'Password@123');
  console.log('Users:');
  console.log(`- Community Admin: admin@${domain}`);
  console.log(`- Resident Owner: owner@${domain}`);
  console.log(`- Resident Tenant: tenant@${domain}`);
  console.log(`- Security Guard: guard@${domain}`);

  process.exit(0);
}

run().catch(console.error);
