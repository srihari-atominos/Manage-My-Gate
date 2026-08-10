/**
 * ============================================================
 *  MANAGE-MY-GATE — Multi-Community Seed Script
 *  Seeds 3 Distinct Communities:
 *    1. Greenfield Heights Community
 *    2. Sunrise Valley Estates
 *    3. Palm Meadows Residency
 *
 *  Covers for each Community:
 *    - Organization & Settings
 *    - Custom Roles & Mapped Permissions
 *    - Multiple Users across all Roles (Admin, Facility Mgr, Guard, Owner, Tenant, Family)
 *    - Super Admin Platform Account
 *    - Villas / Units (Apartments, Villas, Penthouses)
 *    - OrgMemberships
 *    - Amenities & Bookings
 *    - Complaints & Ticket Assignments
 *    - Visitor Passes & Gate Logs
 *    - Notice Board Announcements
 *    - Assessments & Invoices
 *    - Wallets & Transactions
 *    - Excel Export with Credentials & Scenarios
 * ============================================================
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Model Imports ───────────────────────────────────────────
import Organization   from './src/features/organization/organization.model.js';
import Role           from './src/features/role/role.model.js';
import User           from './src/features/user/user.model.js';
import Villa          from './src/features/villa/villa.model.js';
import OrgMembership  from './src/features/orgMembership/orgMembership.model.js';
import { Permission }  from './src/features/permission/permission.model.js';
import { RolePermission } from './src/features/rolePermission/rolePermission.model.js';
import { syncPermissions } from './src/utils/permissionSync.util.js';
import Assessment     from './src/features/assessment/assessment.model.js';
import Invoice        from './src/features/invoice/invoice.model.js';
import Complaint      from './src/features/complaint/complaint.model.js';
import Amenity        from './src/features/amenity/amenity.model.js';
import AmenityBooking from './src/features/amenityBooking/amenityBooking.model.js';
import VisitorPass    from './src/features/visitorPass/visitorPass.model.js';
import VisitorLog     from './src/features/visitorLog/visitorLog.model.js';
import Notice         from './src/features/noticeBoard/noticeBoard.model.js';
import { Wallet, WalletTransaction } from './src/features/wallet/wallet.model.js';

const MONGO_URI           = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';
const DEFAULT_PASSWORD    = 'Test@1234';
const SUPER_ADMIN_EMAIL   = process.env.SUPER_ADMIN_EMAIL || 'admin@enterprise.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPwd@123';

// ── Role Permissions Mapping Matrix ────────────────────────
const ROLE_PERMISSIONS = {
  'Community Admin': [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'roles:create', 'roles:read', 'roles:update', 'roles:delete',
    'villas:create', 'villas:read', 'villas:update', 'villas:delete',
    'integrations:create', 'integrations:read', 'integrations:update', 'integrations:delete',
    'amenities:dashboard', 'amenities:admin_calander', 'amenities:ledgers',
    'amenities:amenities', 'amenities:maintenance', 'amenities:settings',
    'amenities:scanner', 'amenities:security_logs',
    'complaints:view', 'complaints:create', 'complaints:update', 'complaints:delete',
    'complaints:assign', 'complaints:dashboard', 'complaints:reports',
    'complaints:calendar', 'complaints:settings', 'complaints:comments',
    'complaints:timeline', 'complaints:export', 'complaints:analytics',
    'complaints:staff', 'complaints:raise_ticket', 'complaints:track_requests',
    'complaints:complaint_management', 'complaints:assignee',
    'visitor:admin', 'visitor:resident', 'visitor:guard',
    'notices:create', 'notices:read', 'notices:update', 'notices:delete',
    'billing:dashboard', 'billing:assessment_manager', 'billing:action_center',
  ],
  'Facility Manager': [
    'villas:read',
    'amenities:dashboard', 'amenities:admin_calander', 'amenities:ledgers',
    'amenities:amenities', 'amenities:maintenance', 'amenities:settings',
    'amenities:scanner', 'amenities:security_logs',
    'complaints:view', 'complaints:create', 'complaints:update',
    'complaints:assign', 'complaints:dashboard', 'complaints:reports',
    'complaints:calendar', 'complaints:settings', 'complaints:comments',
    'complaints:timeline', 'complaints:staff', 'complaints:track_requests',
    'complaints:complaint_management', 'complaints:assignee',
    'notices:create', 'notices:read', 'notices:update',
    'visitor:admin',
    'billing:dashboard', 'billing:action_center',
  ],
  'Security Guard': [
    'visitor:guard',
    'notices:read',
    'villas:read',
    'complaints:raise_ticket', 'complaints:track_requests',
  ],
  'Resident Owner': [
    'villas:read',
    'amenities:discover', 'amenities:my_booking', 'amenities:wallet',
    'complaints:raise_ticket', 'complaints:track_requests',
    'complaints:view', 'complaints:comments', 'complaints:timeline',
    'visitor:resident',
    'notices:read',
    'billing:action_center',
  ],
  'Resident Tenant': [
    'villas:read',
    'amenities:discover', 'amenities:my_booking', 'amenities:wallet',
    'complaints:raise_ticket', 'complaints:track_requests',
    'complaints:view', 'complaints:comments', 'complaints:timeline',
    'visitor:resident',
    'notices:read',
    'billing:action_center',
  ],
  'Family Member': [
    'notices:read',
    'visitor:resident',
    'complaints:raise_ticket', 'complaints:track_requests',
  ],
};

// ── Definition of the 3 Communities ──────────────────────────
const COMMUNITIES_CONFIG = [
  {
    key: 'greenfield',
    name: 'Greenfield Heights Community',
    type: 'Residential',
    code: 'GHC',
    domain: 'greenfield.com',
    phonePrefix: '9810',
    blocks: [
      { name: 'Block A', count: 10, type: 'Apartment' },
      { name: 'Block B', count: 10, type: 'Villa' },
      { name: 'Block C', count: 10, type: 'Penthouse' }
    ],
    usersCount: { admins: 2, managers: 2, guards: 2, owners: 10, tenants: 10, family: 4 },
  },
  {
    key: 'sunrise',
    name: 'Sunrise Valley Estates',
    type: 'Residential',
    code: 'SVE',
    domain: 'sunrisevalley.com',
    phonePrefix: '9820',
    blocks: [
      { name: 'Phase 1', count: 10, type: 'Villa' },
      { name: 'Phase 2', count: 10, type: 'Apartment' }
    ],
    usersCount: { admins: 1, managers: 1, guards: 2, owners: 7, tenants: 7, family: 2 },
  },
  {
    key: 'palm',
    name: 'Palm Meadows Residency',
    type: 'Residential',
    code: 'PMR',
    domain: 'palmmeadows.com',
    phonePrefix: '9830',
    blocks: [
      { name: 'Tower 1', count: 8, type: 'Penthouse' },
      { name: 'Tower 2', count: 8, type: 'Apartment' }
    ],
    usersCount: { admins: 1, managers: 1, guards: 1, owners: 5, tenants: 5, family: 2 },
  }
];

// ── Names Pool ──────────────────────────────────────────────
const FIRST_NAMES = [
  'Aarav','Aditi','Akash','Ananya','Arjun','Bhavna','Chirag','Deepa','Dev','Divya',
  'Farhan','Gayatri','Harish','Ishaan','Jaya','Karan','Kavya','Lakshmi','Manav','Meera',
  'Neeraj','Nisha','Om','Pooja','Pranav','Priya','Rahul','Rajesh','Rekha','Rohit',
  'Sahil','Sangeeta','Sanjay','Sapna','Seema','Shiv','Shreya','Siddharth','Simran','Sneha',
  'Suresh','Tanvi','Tushar','Usha','Varun','Vikram','Vinay','Vishal','Yamini','Zara'
];
const LAST_NAMES = [
  'Sharma','Patel','Gupta','Singh','Kumar','Reddy','Nair','Iyer','Joshi','Mehta',
  'Shah','Verma','Mishra','Rao','Choudhury','Pillai','Bose','Menon','Agarwal','Kapoor',
  'Sinha','Jain','Chauhan','Tiwari','Pandey','Das','Banerjee','Bhat','Desai','Ghosh'
];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d) => new Date(Date.now() + d * 86_400_000);
const formatDateStr = (dateObj) => dateObj.toISOString().split('T')[0];

async function seedMultiCommunity() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   MANAGE-MY-GATE — MULTI-COMMUNITY SEEDING (3 ORGS)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB connected successfully.\n');

  // 1. Sync permissions baseline
  console.log('⏳  Syncing global permission registry...');
  await syncPermissions();
  const allPermissions = await Permission.find({}).lean();
  const permMap = {};
  for (const p of allPermissions) {
    permMap[p.name] = p._id;
  }
  console.log(`✔  Loaded ${allPermissions.length} permissions.\n`);

  // Password hashes
  const hashedDefaultPassword    = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const hashedSuperAdminPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  // Data structures for Excel export
  const masterCredRows = [];
  const orgCredSheets  = {};

  // ── PHASE 0: PLATFORM & SUPER ADMIN SETUP ─────────────────────
  console.log('⏳  Phase 0: Setting up Platform & Super Admin...');
  let platformOrg = await Organization.findOne({ isPlatform: true });
  if (!platformOrg) {
    platformOrg = await Organization.create({
      name: 'ManageMyGate Platform Admin',
      status: 'Active',
      organizationType: 'Corporate',
      allowedFeatures: ['billing', 'villas', 'visitor', 'complaints', 'amenities', 'roles', 'users'],
      isPlatform: true,
    });
  }

  // Super Admin user
  let superAdmin = await User.findOne({ $or: [{ email: SUPER_ADMIN_EMAIL }, { username: 'superadmin' }] });
  if (!superAdmin) {
    superAdmin = await User.create({
      email: SUPER_ADMIN_EMAIL,
      username: 'superadmin',
      password: hashedSuperAdminPassword,
      status: 'Active',
      name: 'Super Admin',
      phone: '+919900000000',
      emailVerified: true,
      phoneVerified: true,
    });
  } else {
    superAdmin.password = hashedSuperAdminPassword;
    superAdmin.status = 'Active';
    await superAdmin.save();
  }

  // Super Admin Platform Role
  let superRole = await Role.findOne({ name: 'Super Admin', orgId: platformOrg._id });
  if (!superRole) {
    superRole = await Role.create({
      name: 'Super Admin',
      orgId: platformOrg._id,
      description: 'Platform Super Administrator with global access',
      isTenantRole: false,
    });
  }

  // Super Admin membership in Platform Org
  await OrgMembership.updateOne(
    { userId: superAdmin._id, orgId: platformOrg._id },
    {
      userId: superAdmin._id,
      orgId: platformOrg._id,
      roleId: superRole._id,
      roleIds: [superRole._id],
      status: 'Active',
    },
    { upsert: true }
  );

  masterCredRows.push({
    'S.No': 1,
    'Community Name': 'PLATFORM GLOBAL',
    'Role / Category': 'Super Admin',
    'Full Name': 'Super Admin',
    'Email / Login': process.env.SUPER_ADMIN_EMAIL,
    'Password': process.env.SUPER_ADMIN_PASSWORD,
    'Username': 'superadmin',
    'Phone': '+919900000000',
    'Assigned Unit': 'All / Platform',
    'Status': 'Active',
    'Key Testing Focus': 'Global administration, community creation, system configuration.',
  });

  console.log(`✔  Super Admin account ready: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}\n`);

  // ── PROCESS EACH COMMUNITY ────────────────────────────────────
  let globalUserIndex = 1;

  for (const cfg of COMMUNITIES_CONFIG) {
    console.log(`\n===========================================================`);
    console.log(`🏢  BUILDING COMMUNITY: ${cfg.name}`);
    console.log(`===========================================================`);

    orgCredSheets[cfg.key] = [];

    // 1. Clean up existing data for this community name
    let org = await Organization.findOne({ name: cfg.name });
    if (org) {
      const oid = org._id;
      console.log(`   Cleaning previous data for ${cfg.name}...`);
      await Promise.all([
        Invoice.deleteMany({ targetUserId: { $in: (await User.find({ email: new RegExp(`@${cfg.domain.replace('.', '\\.')}$`) })).map(u => u._id) } }),
        Assessment.deleteMany({ communityId: oid }),
        Complaint.deleteMany({ orgId: oid }),
        AmenityBooking.deleteMany({ orgId: oid }),
        Amenity.deleteMany({ orgId: oid }),
        VisitorPass.deleteMany({ orgId: oid }),
        VisitorLog.deleteMany({ orgId: oid }),
        Notice.deleteMany({ orgId: oid }),
        OrgMembership.deleteMany({ orgId: oid }),
        Villa.deleteMany({ orgId: oid }),
        RolePermission.deleteMany({ roleId: { $in: (await Role.find({ orgId: oid })).map(r => r._id) } }),
        Role.deleteMany({ orgId: oid }),
      ]);

      const oldUsers = await User.find({ email: new RegExp(`@${cfg.domain.replace('.', '\\.')}$`) });
      const uids = oldUsers.map(u => u._id);
      await Wallet.deleteMany({ userId: { $in: uids } });
      await WalletTransaction.deleteMany({ userId: { $in: uids } });
      await User.deleteMany({ email: new RegExp(`@${cfg.domain.replace('.', '\\.')}$`) });
      await Organization.deleteOne({ _id: oid });
    }

    // 2. Create Organization
    org = await Organization.create({
      name: cfg.name,
      status: 'Active',
      organizationType: cfg.type,
      contactEmail: `contact@${cfg.domain}`,
      contactPhone: `+91${cfg.phonePrefix}00000`,
      timezone: 'Asia/Kolkata',
      allowedFeatures: ['billing', 'villas', 'visitor', 'complaints', 'amenities', 'roles', 'users', 'notices', 'wallets'],
      isPlatform: false,
      financialSettings: {
        fyStartMonth: 4,
        fyEndMonth: 3,
        currentFy: '2026-2027',
        invoicePrefix: cfg.code,
        invoiceSequenceResetPolicy: 'YEARLY',
        billingConfigVersion: 1,
      },
    });
    console.log(`   ✔ Organization Created: ID [${org._id}]`);

    // 3. Create Roles & Permissions
    const rolesMap = {};
    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      const isTenantRole = ['Resident Owner', 'Resident Tenant', 'Family Member'].includes(roleName);
      const rDoc = await Role.create({
        name: roleName,
        orgId: org._id,
        description: `${roleName} role for ${cfg.name}`,
        isTenantRole,
      });
      rolesMap[roleName] = rDoc;

      // Assign permissions
      const permNames = ROLE_PERMISSIONS[roleName] || [];
      const rolePerms = [];
      for (const pName of permNames) {
        if (permMap[pName]) {
          rolePerms.push({ roleId: rDoc._id, permissionId: permMap[pName] });
        }
      }
      if (rolePerms.length > 0) {
        await RolePermission.insertMany(rolePerms, { ordered: false });
      }
    }
    console.log(`   ✔ 6 Roles & Permissions Created & Mapped.`);

    // Link Super Admin to this community as Community Admin
    await OrgMembership.updateOne(
      { userId: superAdmin._id, orgId: org._id },
      {
        userId: superAdmin._id,
        orgId: org._id,
        roleId: rolesMap['Community Admin']._id,
        roleIds: [rolesMap['Community Admin']._id],
        status: 'Active',
      },
      { upsert: true }
    );

    // 4. Create Villas / Units
    const villasList = [];
    for (const b of cfg.blocks) {
      for (let i = 1; i <= b.count; i++) {
        const unitNumber = b.name.includes('Block')
          ? `${b.name.replace('Block ', '')}-${100 + i}`
          : b.name.includes('Phase')
          ? `P${b.name.replace('Phase ', '')}-${String(i).padStart(2, '0')}`
          : `T${b.name.replace('Tower ', '')}-${100 + i}`;

        const v = await Villa.create({
          orgId: org._id,
          unitNumber,
          blockOrBuilding: b.name,
          type: b.type,
          floorAreaSqFt: b.type === 'Penthouse' ? 2400 : b.type === 'Villa' ? 1800 : 1200,
          status: 'Occupied',
          residents: [],
        });
        villasList.push(v);
      }
    }
    console.log(`   ✔ ${villasList.length} Units/Villas Created.`);

    // 5. User Creation Helper
    let phoneCounter = 1000;
    const createCommunityUser = async (roleName, emailPrefix, fullName, customFields = {}) => {
      const email = `${emailPrefix}@${cfg.domain}`;
      const username = `${emailPrefix}_${cfg.key}`;
      const phone = `+91${cfg.phonePrefix}${String(phoneCounter++).padStart(4, '0')}`;
      const roleObj = rolesMap[roleName];

      const u = await User.create({
        email,
        username,
        password: hashedDefaultPassword,
        status: 'Active',
        name: fullName,
        phone,
        emailVerified: true,
        phoneVerified: true,
        roles: [roleObj._id],
        residencyType: customFields.residencyType || 'None',
        villaId: customFields.villaId || null,
      });

      // OrgMembership
      const memObj = {
        userId: u._id,
        orgId: org._id,
        roleId: roleObj._id,
        roleIds: [roleObj._id],
        status: 'Active',
        villaId: customFields.villaId || null,
        residentType: customFields.residencyType || 'None',
      };
      if (customFields.villaId) {
        memObj.units = [{ villaId: customFields.villaId, residentType: customFields.residencyType || 'None' }];
      }
      await OrgMembership.create(memObj);

      // Create Wallet if resident
      if (['Resident Owner', 'Resident Tenant'].includes(roleName)) {
        await Wallet.create({
          userId: u._id,
          orgId: org._id,
          balance: 5000,
          currency: 'INR',
          status: 'ACTIVE',
        });
      }

      // Record for Excel
      const row = {
        'S.No': masterCredRows.length + 1,
        'Community Name': cfg.name,
        'Role / Category': roleName,
        'Full Name': fullName,
        'Email / Login': email,
        'Password': DEFAULT_PASSWORD,
        'Username': username,
        'Phone': phone,
        'Assigned Unit': customFields.unitNumber || 'N/A',
        'Status': 'Active',
        'Key Testing Focus': customFields.testFocus || `${roleName} features in ${cfg.name}`,
      };

      masterCredRows.push(row);
      orgCredSheets[cfg.key].push(row);
      return u;
    };

    // Create Community Admins
    const communityAdmins = [];
    for (let i = 1; i <= cfg.usersCount.admins; i++) {
      const fName = rnd(FIRST_NAMES);
      const lName = rnd(LAST_NAMES);
      const u = await createCommunityUser(
        'Community Admin',
        `admin${i}`,
        `${fName} ${lName}`,
        { testFocus: 'Full Admin controls, user setup, billing, complaints assignment, notice publishing.' }
      );
      communityAdmins.push(u);
    }

    // Create Facility Managers
    const facilityManagers = [];
    for (let i = 1; i <= cfg.usersCount.managers; i++) {
      const fName = rnd(FIRST_NAMES);
      const lName = rnd(LAST_NAMES);
      const u = await createCommunityUser(
        'Facility Manager',
        `fm${i}`,
        `${fName} ${lName}`,
        { testFocus: 'Amenity scheduling, maintenance slots, ticket updates, facility inspection.' }
      );
      facilityManagers.push(u);
    }

    // Create Security Guards
    const securityGuards = [];
    for (let i = 1; i <= cfg.usersCount.guards; i++) {
      const fName = rnd(FIRST_NAMES);
      const lName = rnd(LAST_NAMES);
      const u = await createCommunityUser(
        'Security Guard',
        `guard${i}`,
        `${fName} ${lName}`,
        { testFocus: 'Gate entry/exit scanner, visitor verification, passcode validation.' }
      );
      securityGuards.push(u);
    }

    // Create Resident Owners & assign to units
    const residentOwners = [];
    for (let i = 0; i < cfg.usersCount.owners; i++) {
      const villa = villasList[i % villasList.length];
      const fName = rnd(FIRST_NAMES);
      const lName = rnd(LAST_NAMES);
      const u = await createCommunityUser(
        'Resident Owner',
        `owner${i + 1}`,
        `${fName} ${lName}`,
        {
          residencyType: 'Owner',
          villaId: villa._id,
          unitNumber: villa.unitNumber,
          testFocus: 'Financial dashboard, tenant arrears, visitor pass generation, amenity booking.'
        }
      );
      residentOwners.push(u);

      await Villa.updateOne(
        { _id: villa._id },
        {
          primaryResidentId: u._id,
          $push: { residents: { userId: u._id, residencyType: 'Owner', isPrimary: true } }
        }
      );
    }

    // Create Resident Tenants & assign to units
    const residentTenants = [];
    for (let i = 0; i < cfg.usersCount.tenants; i++) {
      const villa = villasList[(i + cfg.usersCount.owners) % villasList.length];
      const fName = rnd(FIRST_NAMES);
      const lName = rnd(LAST_NAMES);
      const u = await createCommunityUser(
        'Resident Tenant',
        `tenant${i + 1}`,
        `${fName} ${lName}`,
        {
          residencyType: 'Tenant',
          villaId: villa._id,
          unitNumber: villa.unitNumber,
          testFocus: 'Raise complaints, pay invoices, book amenities, create guest visitor passes.'
        }
      );
      residentTenants.push(u);

      await Villa.updateOne(
        { _id: villa._id },
        {
          $push: { residents: { userId: u._id, residencyType: 'Tenant', isPrimary: false } }
        }
      );
    }

    // Create Family Members
    const familyMembers = [];
    for (let i = 0; i < cfg.usersCount.family; i++) {
      const villa = villasList[i % villasList.length];
      const fName = rnd(FIRST_NAMES);
      const lName = rnd(LAST_NAMES);
      const u = await createCommunityUser(
        'Family Member',
        `family${i + 1}`,
        `${fName} ${lName}`,
        {
          residencyType: 'Family Member',
          villaId: villa._id,
          unitNumber: villa.unitNumber,
          testFocus: 'View notices, view community events, raise quick complaints.'
        }
      );
      familyMembers.push(u);

      await Villa.updateOne(
        { _id: villa._id },
        {
          $push: { residents: { userId: u._id, residencyType: 'Family Member', isPrimary: false } }
        }
      );
    }

    console.log(`   ✔ ${masterCredRows.length - globalUserIndex + 1} Users created & assigned for ${cfg.name}.`);

    // 6. Create Amenities
    const bookingRulesBase = {
      slotDurationMinutes: 60,
      bufferTimeMinutes: 15,
      openTime: '06:00',
      closeTime: '22:00',
      maxBookingsPerUserPerSlot: 2,
      advanceBookingDays: 7,
      minAdvanceBookingHours: 2,
      isCancellationEnabled: true,
      weeklyOffDays: [],
    };

    const amenities = await Amenity.insertMany([
      {
        orgId: org._id,
        name: 'Clubhouse Gymnasium',
        description: 'Fully equipped fitness gym with modern cardio & strength equipment.',
        type: 'gym',
        capacity: 25,
        location: 'Clubhouse 1st Floor',
        bookingRules: bookingRulesBase,
        pricing: { baseRate: 0, pricingType: 'hourly' },
        status: 'active',
      },
      {
        orgId: org._id,
        name: 'Swimming Pool',
        description: 'Temperature-controlled swimming pool with dedicated kids splash area.',
        type: 'pool',
        capacity: 30,
        location: 'Main Pavilion',
        bookingRules: bookingRulesBase,
        pricing: { baseRate: 50, pricingType: 'hourly' },
        status: 'active',
      },
      {
        orgId: org._id,
        name: 'Grand Party & Banquet Hall',
        description: 'Spacious air-conditioned hall for birthday parties and community gatherings.',
        type: 'hall',
        capacity: 150,
        location: 'Community Center Ground Floor',
        bookingRules: bookingRulesBase,
        pricing: { baseRate: 500, pricingType: 'hourly' },
        status: 'active',
      },
      {
        orgId: org._id,
        name: 'Synthetic Tennis Court',
        description: 'Floodlit outdoor tennis court.',
        type: 'court',
        capacity: 4,
        location: 'Sports Complex',
        bookingRules: bookingRulesBase,
        pricing: { baseRate: 100, pricingType: 'hourly' },
        status: 'active',
      }
    ]);
    console.log(`   ✔ ${amenities.length} Amenities Created.`);

    // 7. Amenity Bookings
    if (residentOwners.length > 0 && amenities.length > 0) {
      await AmenityBooking.insertMany([
        {
          orgId: org._id,
          amenityId: amenities[0]._id,
          userId: residentOwners[0]._id,
          bookingNumber: `BK-${cfg.code}-001`,
          bookingDate: formatDateStr(daysAhead(1)),
          startTime: '07:00',
          endTime: '08:00',
          purpose: 'Morning workout session',
          status: 'confirmed',
          numberOfPersons: 1,
        },
        {
          orgId: org._id,
          amenityId: amenities[2]._id,
          userId: residentOwners[1]._id,
          bookingNumber: `BK-${cfg.code}-002`,
          bookingDate: formatDateStr(daysAhead(3)),
          startTime: '18:00',
          endTime: '21:00',
          purpose: 'Family Birthday Party',
          status: 'pending',
          numberOfPersons: 25,
        }
      ]);
      console.log(`   ✔ Amenity Bookings Created.`);
    }

    // 8. Create Complaints
    if (residentTenants.length > 0 && facilityManagers.length > 0) {
      const residentUser = residentTenants[0];
      const villaObj = villasList[0];
      await Complaint.insertMany([
        {
          orgId: org._id,
          complaintNumber: `GFC-${cfg.code}-101`,
          residentId: residentUser._id,
          residentName: residentUser.name,
          residentEmail: residentUser.email,
          residentMobile: residentUser.phone,
          category: 'Plumbing',
          subCategory: 'Pipe Leakage',
          department: 'Maintenance',
          title: `Water Leakage in Master Bathroom (${villaObj.unitNumber})`,
          description: 'Pipe leaking under the sink causing water accumulation.',
          priority: 'High',
          status: 'In Progress',
          location: { building: villaObj.blockOrBuilding, flat: villaObj.unitNumber },
          assignedTechnicianId: facilityManagers[0]._id,
          assignedTechnicianName: facilityManagers[0].name,
        },
        {
          orgId: org._id,
          complaintNumber: `GFC-${cfg.code}-102`,
          residentId: residentOwners[0]._id,
          residentName: residentOwners[0].name,
          residentEmail: residentOwners[0].email,
          residentMobile: residentOwners[0].phone,
          category: 'Electrical',
          subCategory: 'Light Flicker',
          department: 'Maintenance',
          title: 'Corridor Light Flicker on 2nd Floor',
          description: 'Tube light flickering near elevator entrance.',
          priority: 'Low',
          status: 'Open',
        }
      ]);
      console.log(`   ✔ Complaints Created & Assigned.`);
    }

    // 9. Visitor Passes & Visitor Logs
    if (residentOwners.length > 0 && securityGuards.length > 0) {
      const vPass = await VisitorPass.create({
        orgId: org._id,
        createdById: residentOwners[0]._id,
        visitorDetails: {
          name: 'Ramesh Sharma',
          phone: '+919876543210',
        },
        passCode: `${cfg.code}8899`,
        passType: 'GUEST',
        validity: {
          startDate: daysAgo(1),
          endDate: daysAhead(1),
          timeWindowStart: '08:00',
          timeWindowEnd: '20:00',
        },
        status: 'ACTIVE',
      });

      await VisitorLog.create({
        orgId: org._id,
        passId: vPass._id,
        guardId: securityGuards[0]._id,
        residentId: residentOwners[0]._id,
        entryType: 'PRE_APPROVED',
        logStatus: 'INSIDE',
        snapshot: {
          visitorName: 'Ramesh Sharma',
        },
        checkInTime: daysAgo(0.5),
      });
      console.log(`   ✔ Visitor Pass & Entry Logs Created.`);
    }

    // 10. Notice Board
    if (communityAdmins.length > 0) {
      await Notice.insertMany([
        {
          orgId: org._id,
          title: `Welcome to ${cfg.name}`,
          description: `We are delighted to welcome all residents! Please reach out to management for any facility requests.`,
          category: 'General',
          priority: 'High',
          status: 'Published',
          isPinned: true,
          expiryDate: daysAhead(60),
          createdBy: communityAdmins[0]._id,
        },
        {
          orgId: org._id,
          title: `Scheduled Elevator Maintenance Notice`,
          description: `Elevators in Block A & B will undergo quarterly preventive maintenance this Saturday from 10 AM to 1 PM.`,
          category: 'Maintenance',
          priority: 'Medium',
          status: 'Published',
          isPinned: false,
          expiryDate: daysAhead(30),
          createdBy: communityAdmins[0]._id,
        }
      ]);
      console.log(`   ✔ Notice Board Announcements Published.`);
    }

    // 11. Assessments & Invoices
    const assessment = await Assessment.create({
      communityId: org._id,
      name: `Monthly Maintenance – July 2026`,
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: { type: 'ALL_COMMUNITY', targetRole: 'BOTH', targetRoleIds: [rolesMap['Resident Owner']._id, rolesMap['Resident Tenant']._id] },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 4500 },
      isActive: true,
    });

    const invoiceDocs = [];
    for (let i = 0; i < residentOwners.length; i++) {
      const u = residentOwners[i];
      const villa = villasList[i % villasList.length];
      const status = i % 3 === 0 ? 'PAID' : i % 3 === 1 ? 'UNPAID' : 'OVERDUE';
      const amt = 4500;
      invoiceDocs.push({
        orgId: org._id,
        communityId: org._id,
        assessmentId: assessment._id,
        targetUserId: u._id,
        unitId: villa._id,
        invoiceNumber: `INV-${cfg.code}-2026-${String(i + 1).padStart(3, '0')}`,
        billingPeriodString: '2026-07',
        currentCharge: amt,
        totalAmount: amt,
        outstandingAmount: status === 'PAID' ? 0 : amt,
        paidAmount: status === 'PAID' ? amt : 0,
        status: status,
        dueDate: daysAhead(10),
      });
    }
    await Invoice.insertMany(invoiceDocs);
    console.log(`   ✔ ${invoiceDocs.length} Billing Invoices Created.`);
  }

  // ── PHASE 3: GENERATE EXCEL WORKBOOK ──────────────────────────
  console.log('\n===========================================================');
  console.log('📊  GENERATING EXCEL CREDENTIALS WORKBOOK');
  console.log('===========================================================');

  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Credentials List
  const wsMaster = XLSX.utils.json_to_sheet(masterCredRows);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Master Credentials');

  // Sheet 2, 3, 4: Individual Community Credentials
  for (const cfg of COMMUNITIES_CONFIG) {
    const wsOrg = XLSX.utils.json_to_sheet(orgCredSheets[cfg.key]);
    const sheetTitle = cfg.name.split(' ')[0] + ' Credentials';
    XLSX.utils.book_append_sheet(wb, wsOrg, sheetTitle);
  }

  // Sheet 5: Roles & Access Matrix
  const roleMatrixRows = [
    { 'Role Name': 'Super Admin', 'Level': 'Global Platform', 'Permissions': 'Full unrestricted access across all organizations and system settings.' },
    { 'Role Name': 'Community Admin', 'Level': 'Community Level', 'Permissions': 'Full admin access to User Management, Roles, Billing, Complaints, Amenities, Notices, Integrations.' },
    { 'Role Name': 'Facility Manager', 'Level': 'Community Level', 'Permissions': 'Manage Amenities, Maintenance schedules, Complaint assignment & progress tracking, Notice board.' },
    { 'Role Name': 'Security Guard', 'Level': 'Gate Control', 'Permissions': 'Gate entry/exit scanner, Visitor pass passcode verification, Security logs, read Notices.' },
    { 'Role Name': 'Resident Owner', 'Level': 'Resident Level', 'Permissions': 'View own financials & tenant arrears, Pay invoices, Book amenities, Generate guest passes, Raise complaints.' },
    { 'Role Name': 'Resident Tenant', 'Level': 'Resident Level', 'Permissions': 'View & pay rental/unit invoices, Book amenities, Generate guest visitor passes, Submit complaints.' },
    { 'Role Name': 'Family Member', 'Level': 'Resident Level', 'Permissions': 'View community notices, view events, submit quick maintenance requests.' },
  ];
  const wsMatrix = XLSX.utils.json_to_sheet(roleMatrixRows);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Roles & Access Matrix');

  // Sheet 6: Testing Scenarios
  const scenarioRows = [
    { 'Scenario ID': 'SCEN-001', 'Actor': 'Super Admin', 'Target Feature': 'Platform Multi-Community Switch', 'Step-by-Step Test Procedure': `1. Login with ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}.\n2. Open workspace dropdown in header.\n3. Verify all 3 communities (Greenfield Heights, Sunrise Valley, Palm Meadows) are listed.\n4. Switch workspace and verify context changes.` },
    { 'Scenario ID': 'SCEN-002', 'Actor': 'Community Admin', 'Target Feature': 'Community Dashboard & Users', 'Step-by-Step Test Procedure': '1. Login with admin1@greenfield.com / Test@1234.\n2. Navigate to User Management.\n3. Verify members list and active roles.\n4. Create a new member or modify roles.' },
    { 'Scenario ID': 'SCEN-003', 'Actor': 'Facility Manager', 'Target Feature': 'Amenity Booking Approval', 'Step-by-Step Test Procedure': '1. Login with fm1@greenfield.com / Test@1234.\n2. Open Amenities tab.\n3. View pending bookings for Banquet Hall.\n4. Click Approve or Reject.\n5. Verify status updates to Confirmed.' },
    { 'Scenario ID': 'SCEN-004', 'Actor': 'Facility Manager', 'Target Feature': 'Complaint Ticket Assignment', 'Step-by-Step Test Procedure': '1. Login with fm1@sunrisevalley.com / Test@1234.\n2. Go to Complaints.\n3. Filter by Open status.\n4. Assign ticket to staff.\n5. Update status to In Progress.' },
    { 'Scenario ID': 'SCEN-005', 'Actor': 'Security Guard', 'Target Feature': 'Gate Visitor Verification', 'Step-by-Step Test Procedure': '1. Login with guard1@greenfield.com / Test@1234.\n2. Open Visitor Log / Guard Portal.\n3. Enter passcode GHC8899.\n4. Click Log Entry (INSIDE).\n5. Confirm visitor record updates.' },
    { 'Scenario ID': 'SCEN-006', 'Actor': 'Resident Owner', 'Target Feature': 'Financials & Tenant Arrears', 'Step-by-Step Test Procedure': '1. Login with owner1@greenfield.com / Test@1234.\n2. Open My Financials.\n3. View maintenance invoice balance.\n4. Check Tenant Arrears tab to see tenant status.' },
    { 'Scenario ID': 'SCEN-007', 'Actor': 'Resident Tenant', 'Target Feature': 'Invoice Settlement & Pass Creation', 'Step-by-Step Test Procedure': '1. Login with tenant1@palmmeadows.com / Test@1234.\n2. Navigate to My Financials -> Pay Invoice.\n3. Navigate to Visitor Passes -> Create Pass for Guest.' },
    { 'Scenario ID': 'SCEN-008', 'Actor': 'Resident Owner/Tenant', 'Target Feature': 'Amenity Slot Discovery & Booking', 'Step-by-Step Test Procedure': '1. Login as owner1@sunrisevalley.com / Test@1234.\n2. Open Amenities -> Discover.\n3. Select Tennis Court, pick tomorrow slot.\n4. Complete booking request.' }
  ];
  const wsScenarios = XLSX.utils.json_to_sheet(scenarioRows);
  XLSX.utils.book_append_sheet(wb, wsScenarios, 'Testing Scenarios');

  // Sheet 7: Multi-Community Seed Summary
  const summaryRows = [
    { 'Metric / Parameter': 'Total Communities Created', 'Value': COMMUNITIES_CONFIG.length },
    { 'Metric / Parameter': 'Community 1', 'Value': 'Greenfield Heights Community (GHC)' },
    { 'Metric / Parameter': 'Community 2', 'Value': 'Sunrise Valley Estates (SVE)' },
    { 'Metric / Parameter': 'Community 3', 'Value': 'Palm Meadows Residency (PMR)' },
    { 'Metric / Parameter': 'Total User Credentials Created', 'Value': masterCredRows.length },
    { 'Metric / Parameter': 'Super Admin Account', 'Value': `${SUPER_ADMIN_EMAIL} (Password: ${SUPER_ADMIN_PASSWORD})` },
    { 'Metric / Parameter': 'All Other Accounts Password', 'Value': DEFAULT_PASSWORD },
    { 'Metric / Parameter': 'Total Roles Configured per Org', 'Value': Object.keys(ROLE_PERMISSIONS).length },
    { 'Metric / Parameter': 'Seed Execution Timestamp', 'Value': new Date().toISOString() },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Seed Summary');

  // Column width formatting
  const setColWidths = (ws, widths) => {
    ws['!cols'] = widths.map(w => ({ wch: w }));
  };
  setColWidths(wsMaster, [6, 28, 18, 22, 30, 18, 20, 16, 16, 10, 60]);
  setColWidths(wsMatrix, [20, 20, 80]);
  setColWidths(wsScenarios, [14, 20, 30, 90]);
  setColWidths(wsSummary, [35, 45]);

  const outPath1 = path.join(__dirname, 'Multi_Community_Test_Credentials.xlsx');
  const outPath2 = path.join(__dirname, '..', 'Multi_Community_Test_Credentials.xlsx');
  const outPath3 = path.join(__dirname, '..', 'Community_Testing_Credentials.xlsx');

  const tryWrite = (filePath) => {
    try {
      XLSX.writeFile(wb, filePath);
      console.log(`     - Saved: ${filePath}`);
    } catch (e) {
      console.warn(`     ⚠️ Could not write to ${filePath} (file may be open).`);
    }
  };

  console.log(`   ✔ Excel workbook write status:`);
  tryWrite(outPath1);
  tryWrite(outPath2);
  tryWrite(outPath3);

  await mongoose.disconnect();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        MULTI-COMMUNITY SEED COMPLETE — SUCCESS! 🎉        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

seedMultiCommunity().catch((err) => {
  console.error('❌ SEED FAILED:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
