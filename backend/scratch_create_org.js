import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

import Organization from './src/features/organization/organization.model.js';
import Workspace from './src/features/workspace/workspace.model.js';
import User from './src/features/user/user.model.js';
import Role from './src/features/role/role.model.js';
import { DEFAULT_MODULES } from './src/features/workspace/workspace.service.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Generate random credentials
  const email = 'admin' + Math.floor(Math.random() * 10000) + '@acmecorp.com';
  const rawPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const username = email.split('@')[0];
  const orgName = 'Acme Corp ' + Math.floor(Math.random() * 1000);

  // 1. Create Organization
  const org = await Organization.create({
    name: orgName,
    organizationType: 'Corporate',
    status: 'Active'
  });
  console.log('Created Org:', org._id);

  // 2. Create Role
  const role = await Role.create({
    name: 'Community Admin',
    orgId: org._id,
    isTenantRole: false
  });
  console.log('Created Role:', role._id);

  // 3. Create User
  const user = await User.create({
    email,
    username,
    password: hashedPassword,
    status: 'Active',
    name: 'Admin User',
    roles: [role._id],
    emailVerified: true,
    phoneVerified: true
  });
  console.log('Created User:', user._id);

  // 4. Create Workspace
  const workspace = await Workspace.create({
    workspaceName: orgName + ' Workspace',
    organizationId: org._id,
    status: 'Active',
    createdBy: user._id,
    modules: DEFAULT_MODULES
  });
  console.log('Created Workspace:', workspace._id);

  console.log('\n--- CREDENTIALS ---');
  console.log('Organization Name:', orgName);
  console.log('Email / Username:', email);
  console.log('Password:', rawPassword);
  
  process.exit(0);
}

run().catch(console.error);
