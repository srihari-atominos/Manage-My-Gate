/**
 * ============================================================
 *  MANAGE-MY-GATE — Full-Flow Community Seed Script
 *  Covers: Org → Roles → 100 Users → 80 Units (4 types) →
 *          Memberships → Assessments → Invoices → Complaints →
 *          Amenities → AmenityBookings → VisitorPasses →
 *          VisitorLogs → NoticeBoard → Wallets → XLSX Export
 * ============================================================
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Model Imports ───────────────────────────────────────────
import Organization  from './src/features/organization/organization.model.js';
import Role          from './src/features/role/role.model.js';
import User          from './src/features/user/user.model.js';
import Villa         from './src/features/villa/villa.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Assessment    from './src/features/assessment/assessment.model.js';
import Invoice       from './src/features/invoice/invoice.model.js';
import Complaint     from './src/features/complaint/complaint.model.js';
import Amenity       from './src/features/amenity/amenity.model.js';
import AmenityBooking from './src/features/amenityBooking/amenityBooking.model.js';
import VisitorPass   from './src/features/visitorPass/visitorPass.model.js';
import { VisitorLog } from './src/features/visitorLog/visitorLog.model.js';
import { Notice }    from './src/features/noticeBoard/noticeBoard.model.js';
import { Wallet, WalletTransaction } from './src/features/wallet/wallet.model.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';
const ORG_NAME  = 'Greenfield Heights Community';
const PASSWORD  = 'Test@1234';

// ─── Helpers ────────────────────────────────────────────────
const pad  = (n) => String(n).padStart(3, '0');
const rnd  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d) => new Date(Date.now() + d * 86_400_000);

// ─── Indian Name Pool ────────────────────────────────────────
const FIRST_NAMES = [
  'Aarav','Aditi','Akash','Ananya','Arjun','Bhavna','Chirag','Deepa','Dev','Divya',
  'Farhan','Gayatri','Harish','Ishaan','Jaya','Karan','Kavya','Lakshmi','Manav','Meera',
  'Neeraj','Nisha','Om','Pooja','Pranav','Priya','Rahul','Rajesh','Rekha','Rohit',
  'Sahil','Sangeeta','Sanjay','Sapna','Seema','Shiv','Shreya','Siddharth','Simran','Sneha',
  'Suresh','Tanvi','Tushar','Usha','Varun','Vikram','Vinay','Vishal','Yamini','Zara',
  'Aditya','Amisha','Ankur','Asha','Bhuvan','Chhaya','Dinesh','Esha','Gaurav','Hema'
];
const LAST_NAMES = [
  'Sharma','Patel','Gupta','Singh','Kumar','Reddy','Nair','Iyer','Joshi','Mehta',
  'Shah','Verma','Mishra','Rao','Choudhury','Pillai','Bose','Menon','Agarwal','Kapoor',
  'Sinha','Jain','Chauhan','Tiwari','Pandey','Das','Banerjee','Bhat','Desai','Ghosh'
];

const makePhone = (idx) => `+9198${String(10000000 + idx).slice(1)}`;

// ─── Main Seed ───────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Manage-My-Gate Full-Flow Seed Script   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB connected.\n');

  // ─── PHASE 0: CLEANUP ─────────────────────────────────────
  console.log('⏳  Phase 0: Cleaning up previous seed data…');
  const existingOrg = await Organization.findOne({ name: ORG_NAME });
  if (existingOrg) {
    const oid = existingOrg._id;
    await Promise.all([
      Invoice.deleteMany({ assessmentId: { $in: (await Assessment.find({ communityId: oid })).map(a => a._id) } }),
      Assessment.deleteMany({ communityId: oid }),
      Complaint.deleteMany({ orgId: oid }),
      AmenityBooking.deleteMany({ orgId: oid }),
      Amenity.deleteMany({ orgId: oid }),
      VisitorPass.deleteMany({ orgId: oid }),
      VisitorLog.deleteMany({ orgId: oid }),
      Notice.deleteMany({ orgId: oid }),
      OrgMembership.deleteMany({ orgId: oid }),
      Villa.deleteMany({ orgId: oid }),
      Role.deleteMany({ orgId: oid }),
    ]);
    const users = await User.find({ email: /@greenfield\.com$/ });
    const uids = users.map(u => u._id);
    await Wallet.deleteMany({ userId: { $in: uids } });
    await WalletTransaction.deleteMany({ userId: { $in: uids } });
    await User.deleteMany({ email: /@greenfield\.com$/ });
    await Organization.deleteOne({ _id: oid });
    console.log('   ✔  Cleanup complete.\n');
  } else {
    console.log('   ✔  No previous data found.\n');
  }

  // ─── PHASE 1: ORGANIZATION ────────────────────────────────
  console.log('⏳  Phase 1: Creating Organization…');
  const org = await Organization.create({
    name: ORG_NAME,
    status: 'Active',
    organizationType: 'Residential',
    allowedFeatures: ['billing', 'villas', 'visitor', 'complaints', 'amenities', 'noticeBoard'],
    isPlatform: false,
  });
  console.log(`   ✔  Org created: ${org.name} [${org._id}]\n`);

  // ─── PHASE 2: ROLES ───────────────────────────────────────
  console.log('⏳  Phase 2: Creating Roles…');
  const roleData = [
    { name: 'Community Admin',    description: 'Full admin control – billing, user management, analytics.', isTenantRole: false },
    { name: 'Facility Manager',   description: 'Manages amenities, maintenance scheduling, complaints.', isTenantRole: false },
    { name: 'Security Guard',     description: 'Gate access control, visitor log management.', isTenantRole: false },
    { name: 'Resident Owner',     description: 'Villa owner with billing & tenant visibility rights.', isTenantRole: true  },
    { name: 'Resident Tenant',    description: 'Tenant occupying a villa; billing & visitor pass rights.', isTenantRole: true  },
    { name: 'Family Member',      description: 'Dependant of an owner or tenant; limited read access.', isTenantRole: true  },
  ];
  const roles = {};
  for (const rd of roleData) {
    roles[rd.name] = await Role.create({ ...rd, orgId: org._id });
  }
  console.log(`   ✔  ${Object.keys(roles).length} Roles created.\n`);

  // ─── PHASE 3: HASH PASSWORD ───────────────────────────────
  const hashedPwd = await bcrypt.hash(PASSWORD, 12);

  // ─── PHASE 4: UNITS (4 types) ─────────────────────────────
  console.log('⏳  Phase 3: Creating 80 Units (4 types across 4 blocks)…');

  const unitDefs = [
    // Block A — Studio  (10 units: A-S-001..010)
    ...Array.from({ length: 10 }, (_, i) => ({
      unitNumber: `A-S-${pad(i + 1)}`,
      blockOrBuilding: 'Block A (Studio Wing)',
      type: 'Studio',
      floorAreaSqFt: 450,
    })),
    // Block B — Apartment (25 units: B-APT-001..025)
    ...Array.from({ length: 25 }, (_, i) => ({
      unitNumber: `B-APT-${pad(i + 1)}`,
      blockOrBuilding: 'Block B (Apartment Tower)',
      type: 'Apartment',
      floorAreaSqFt: rnd([750, 900, 1050]),
    })),
    // Block C — Villa  (30 units: C-VIL-001..030)
    ...Array.from({ length: 30 }, (_, i) => ({
      unitNumber: `C-VIL-${pad(i + 1)}`,
      blockOrBuilding: 'Block C (Villa Enclave)',
      type: 'Villa',
      floorAreaSqFt: rnd([1500, 1800, 2000]),
    })),
    // Block D — Penthouse (15 units: D-PH-001..015)
    ...Array.from({ length: 15 }, (_, i) => ({
      unitNumber: `D-PH-${pad(i + 1)}`,
      blockOrBuilding: 'Block D (Penthouse)',
      type: 'Penthouse',
      floorAreaSqFt: rnd([2500, 3000, 3500]),
    })),
  ];

  // Insert units without residents first (residents added after user creation)
  const units = await Villa.insertMany(
    unitDefs.map(u => ({ ...u, orgId: org._id, status: 'Vacant', residents: [] }))
  );
  console.log(`   ✔  ${units.length} Units created.\n`);

  // ─── PHASE 5: USERS (100 total) ───────────────────────────
  console.log('⏳  Phase 4: Creating 100 Users…');

  /**
   * Distribution Plan (100 users):
   *   2  – Community Admin
   *   3  – Facility Manager
   *   5  – Security Guard
   *  30  – Resident Owner      (paired to units 1-30 → Villas + Penthouses)
   *  40  – Resident Tenant     (paired to units 1-40 → Apartments + Studios)
   *  20  – Family Member       (linked to existing owners/tenants)
   */

  const credRows = []; // For XLSX export
  const usersCreated = { admins: [], managers: [], guards: [], owners: [], tenants: [], family: [] };

  let nameIdx = 0;
  const makeUser = async (role, suffix, phone, extra = {}) => {
    const fn = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(nameIdx / FIRST_NAMES.length) % LAST_NAMES.length];
    nameIdx++;
    const name     = `${fn} ${ln}`;
    const username = `${fn.toLowerCase()}${ln.toLowerCase()}${suffix}`;
    const email    = `${username}@greenfield.com`;
    const u = await User.create({
      email,
      username,
      password: hashedPwd,
      status: 'Active',
      name,
      phone,
      roles: [roles[role]._id],
      residencyType: extra.residencyType || 'None',
      villaId: extra.villaId || null,
    });
    credRows.push({
      'Serial No': credRows.length + 1,
      'Role':      role,
      'Name':      name,
      'Username':  username,
      'Email':     email,
      'Password':  PASSWORD,
      'Assigned Unit':   extra.unitNumber   || 'N/A',
      'Block':           extra.block         || 'N/A',
      'Unit Type':       extra.unitType      || 'N/A',
      'Residency Type':  extra.residencyType || 'None',
      'Status':    'Active',
      'Role Description': roles[role].description,
      'Testing Focus': extra.testFocus || '',
    });
    return u;
  };

  // --- 2 Admins ---
  for (let i = 0; i < 2; i++) {
    const u = await makeUser(
      'Community Admin',
      `_adm${i + 1}`,
      makePhone(credRows.length),
      { testFocus: 'Full admin dashboard: billing KPIs, ledger, complaint management, role assignment.' }
    );
    usersCreated.admins.push(u);
  }

  // --- 3 Facility Managers ---
  for (let i = 0; i < 3; i++) {
    const u = await makeUser(
      'Facility Manager',
      `_fm${i + 1}`,
      makePhone(credRows.length),
      { testFocus: 'Amenity management, complaint assignment, maintenance scheduling.' }
    );
    usersCreated.managers.push(u);
  }

  // --- 5 Security Guards ---
  for (let i = 0; i < 5; i++) {
    const u = await makeUser(
      'Security Guard',
      `_sg${i + 1}`,
      makePhone(credRows.length),
      { testFocus: 'Visitor pass scanning, walk-in logging, gate log management.' }
    );
    usersCreated.guards.push(u);
  }

  // --- 30 Resident Owners ---
  // First 15 paired to Villas (C-VIL-001..015), next 15 to Penthouses (D-PH-001..015)
  const ownerUnits = [...units.filter(u => u.type === 'Villa').slice(0, 15),
                       ...units.filter(u => u.type === 'Penthouse').slice(0, 15)];
  for (let i = 0; i < 30; i++) {
    const unit = ownerUnits[i];
    const u = await makeUser(
      'Resident Owner',
      `_own${i + 1}`,
      makePhone(credRows.length),
      {
        residencyType: i < 20 ? 'Resident Owner' : 'Non-Resident Owner',
        villaId:     unit._id,
        unitNumber:  unit.unitNumber,
        block:       unit.blockOrBuilding,
        unitType:    unit.type,
        testFocus:   'My financials, tenant arrears, visitor pass creation, amenity bookings.',
      }
    );
    usersCreated.owners.push({ user: u, unit });
  }

  // --- 40 Resident Tenants ---
  // First 25 paired to Apartments, next 10 to Studios, last 5 to overflow Villas
  const tenantUnits = [
    ...units.filter(u => u.type === 'Apartment').slice(0, 25),
    ...units.filter(u => u.type === 'Studio').slice(0, 10),
    ...units.filter(u => u.type === 'Villa').slice(15, 20),
  ];
  for (let i = 0; i < 40; i++) {
    const unit = tenantUnits[i];
    const u = await makeUser(
      'Resident Tenant',
      `_ten${i + 1}`,
      makePhone(credRows.length),
      {
        residencyType: 'Tenant',
        villaId:     unit._id,
        unitNumber:  unit.unitNumber,
        block:       unit.blockOrBuilding,
        unitType:    unit.type,
        testFocus:   'Outstanding invoices, offline payment submission, visitor pass, amenity booking.',
      }
    );
    usersCreated.tenants.push({ user: u, unit });
  }

  // --- 20 Family Members ---
  // Linked to the first 20 owners' units
  for (let i = 0; i < 20; i++) {
    const { unit } = usersCreated.owners[i % 30];
    const u = await makeUser(
      'Family Member',
      `_fam${i + 1}`,
      makePhone(credRows.length),
      {
        residencyType: 'Family Member',
        villaId:     unit._id,
        unitNumber:  unit.unitNumber,
        block:       unit.blockOrBuilding,
        unitType:    unit.type,
        testFocus:   'Limited read access: view notices, community announcements, own visitor pass.',
      }
    );
    usersCreated.family.push({ user: u, unit });
  }

  console.log(`   ✔  ${credRows.length} Users created.\n`);

  // ─── PHASE 6: UPDATE UNITS with residents ─────────────────
  console.log('⏳  Phase 5: Assigning residents to units…');
  const unitUpdateOps = [];

  // Owner → unit
  for (const { user: u, unit } of usersCreated.owners) {
    const resType = u.residencyType;
    unitUpdateOps.push(
      Villa.updateOne(
        { _id: unit._id },
        {
          status: 'Occupied',
          primaryResidentId: u._id,
          $push: { residents: { userId: u._id, residencyType: resType, isPrimary: true } },
        }
      )
    );
  }

  // Tenant → unit (add as secondary resident if villa, set primary for apartment/studio)
  for (const { user: u, unit } of usersCreated.tenants) {
    const alreadyHasPrimary = usersCreated.owners.some(o => String(o.unit._id) === String(unit._id));
    unitUpdateOps.push(
      Villa.updateOne(
        { _id: unit._id },
        {
          status: 'Occupied',
          ...(alreadyHasPrimary ? {} : { primaryResidentId: u._id }),
          $push: {
            residents: {
              userId: u._id,
              residencyType: 'Tenant',
              isPrimary: !alreadyHasPrimary,
            },
          },
        }
      )
    );
  }

  // Family → unit (non-primary)
  for (const { user: u, unit } of usersCreated.family) {
    unitUpdateOps.push(
      Villa.updateOne(
        { _id: unit._id },
        { $push: { residents: { userId: u._id, residencyType: 'Family Member', isPrimary: false } } }
      )
    );
  }

  await Promise.all(unitUpdateOps);
  console.log('   ✔  Unit residents assigned.\n');

  // ─── PHASE 7: ORG MEMBERSHIPS ─────────────────────────────
  console.log('⏳  Phase 6: Creating OrgMemberships…');
  const memberships = [];

  for (const u of usersCreated.admins) {
    memberships.push({ userId: u._id, orgId: org._id, roleId: roles['Community Admin']._id, roleIds: [roles['Community Admin']._id], residentType: 'None' });
  }
  for (const u of usersCreated.managers) {
    memberships.push({ userId: u._id, orgId: org._id, roleId: roles['Facility Manager']._id, roleIds: [roles['Facility Manager']._id], residentType: 'None' });
  }
  for (const u of usersCreated.guards) {
    memberships.push({ userId: u._id, orgId: org._id, roleId: roles['Security Guard']._id, roleIds: [roles['Security Guard']._id], residentType: 'None' });
  }
  for (const { user: u, unit } of usersCreated.owners) {
    memberships.push({ userId: u._id, orgId: org._id, roleId: roles['Resident Owner']._id, roleIds: [roles['Resident Owner']._id], villaId: unit._id, residentType: 'Owner' });
  }
  for (const { user: u, unit } of usersCreated.tenants) {
    memberships.push({ userId: u._id, orgId: org._id, roleId: roles['Resident Tenant']._id, roleIds: [roles['Resident Tenant']._id], villaId: unit._id, residentType: 'Tenant' });
  }
  for (const { user: u, unit } of usersCreated.family) {
    memberships.push({ userId: u._id, orgId: org._id, roleId: roles['Family Member']._id, roleIds: [roles['Family Member']._id], villaId: unit._id, residentType: 'Family' });
  }

  await OrgMembership.insertMany(memberships);
  console.log(`   ✔  ${memberships.length} Memberships created.\n`);

  // ─── PHASE 8: ASSESSMENTS ─────────────────────────────────
  console.log('⏳  Phase 7: Creating Assessments…');
  const assessments = await Assessment.insertMany([
    {
      communityId: org._id,
      name: 'Monthly Maintenance – July 2026',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: { type: 'ALL_COMMUNITY', targetRole: 'BOTH', targetRoleIds: [roles['Resident Owner']._id, roles['Resident Tenant']._id] },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 5500 },
      isActive: true,
    },
    {
      communityId: org._id,
      name: 'Security Fund One-Time Levy 2026',
      type: 'ONE_TIME',
      billingCycle: 'AD_HOC',
      generationDay: 1,
      targetScope: { type: 'ALL_COMMUNITY', targetRole: 'OWNER', targetRoleIds: [roles['Resident Owner']._id] },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 10000 },
      isActive: true,
    },
    {
      communityId: org._id,
      name: 'Water & Utilities – July 2026',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 5,
      targetScope: { type: 'ALL_COMMUNITY', targetRole: 'BOTH', targetRoleIds: [roles['Resident Owner']._id, roles['Resident Tenant']._id] },
      calculationMethod: { type: 'PER_SQ_FT', ratePerSqFt: 2.5 },
      isActive: true,
    },
    {
      communityId: org._id,
      name: 'Penthouse Club Membership Q3 2026',
      type: 'RECURRING',
      billingCycle: 'QUARTERLY',
      generationDay: 1,
      targetScope: { type: 'UNIT_TYPE', targetRole: 'OWNER', targetRoleIds: [roles['Resident Owner']._id] },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 15000 },
      isActive: true,
    },
  ]);
  const [asnMaint, asnSecurity, asnWater, asnClub] = assessments;
  console.log(`   ✔  ${assessments.length} Assessments created.\n`);

  // ─── PHASE 9: INVOICES ────────────────────────────────────
  console.log('⏳  Phase 8: Creating Invoices for all residents…');
  const STATUSES  = ['UNPAID', 'UNPAID', 'UNPAID', 'VERIFICATION_PENDING', 'PAID', 'PAID', 'CANCELLED'];
  const PAY_METHS = ['UPI', 'NETBANKING', 'CHEQUE', 'NEFT', 'CASH', 'CARD'];
  const invoiceDocs = [];
  const allResidents = [...usersCreated.owners, ...usersCreated.tenants];

  for (const { user: u, unit } of allResidents) {
    const status = rnd(STATUSES);
    const isPaid = status === 'PAID';
    const isVP   = status === 'VERIFICATION_PENDING';
    const amount = asnMaint.calculationMethod.flatAmount;

    invoiceDocs.push({
      invoiceNumber:      uuidv4(),
      communityId:        org._id,
      orgId:              org._id,
      assessmentId:       asnMaint._id,
      targetUserId:       u._id,
      unitId:             unit._id,
      billingPeriodString:'2026-07',
      currentCharge:      amount,
      totalAmount:        amount,
      outstandingAmount:  isPaid ? 0 : amount,
      paidAmount:         isPaid ? amount : 0,
      hardcodedAmount:    amount,
      taxAmount:          0,
      totalDue:           amount,
      dueDate:            daysAhead(15),
      status,
      paymentMethod:      (isPaid || isVP) ? rnd(PAY_METHS) : null,
      offlineReference:   isVP ? `REF-${uuidv4().split('-')[0].toUpperCase()}` : null,
      paid_at:            isPaid ? daysAgo(rndInt(1, 10)) : null,
      settled_at:         isPaid ? daysAgo(rndInt(1, 10)) : null,
    });
  }

  // Security fund — owners only
  for (const { user: u, unit } of usersCreated.owners) {
    const status = rnd(['UNPAID', 'PAID', 'VERIFICATION_PENDING']);
    const isPaid = status === 'PAID';
    const amount = 10000;
    invoiceDocs.push({
      invoiceNumber:      uuidv4(),
      communityId:        org._id,
      orgId:              org._id,
      assessmentId:       asnSecurity._id,
      targetUserId:       u._id,
      unitId:             unit._id,
      billingPeriodString:'2026-07',
      currentCharge:      amount,
      totalAmount:        amount,
      outstandingAmount:  isPaid ? 0 : amount,
      paidAmount:         isPaid ? amount : 0,
      hardcodedAmount:    amount,
      taxAmount:          0,
      totalDue:           amount,
      dueDate:            daysAhead(30),
      status,
      paymentMethod:      isPaid ? rnd(PAY_METHS) : null,
      paid_at:            isPaid ? daysAgo(rndInt(1, 5)) : null,
      settled_at:         isPaid ? daysAgo(rndInt(1, 5)) : null,
    });
  }

  // Water bill — per sq ft
  for (const { user: u, unit } of allResidents) {
    const sqft   = unit.floorAreaSqFt || 900;
    const amount = Math.round(sqft * 2.5);
    const tax    = Math.round(amount * 0.05);
    const total  = Math.round(amount * 1.05);
    const status = rnd(STATUSES);
    const isPaid = status === 'PAID';
    invoiceDocs.push({
      invoiceNumber:      uuidv4(),
      communityId:        org._id,
      orgId:              org._id,
      assessmentId:       asnWater._id,
      targetUserId:       u._id,
      unitId:             unit._id,
      billingPeriodString:'2026-07',
      currentCharge:      amount,
      taxAmount:          tax,
      totalAmount:        total,
      outstandingAmount:  isPaid ? 0 : total,
      paidAmount:         isPaid ? total : 0,
      hardcodedAmount:    amount,
      totalDue:           total,
      dueDate:            daysAhead(20),
      status,
      paymentMethod:      isPaid ? rnd(PAY_METHS) : null,
      paid_at:            isPaid ? daysAgo(rndInt(1, 8)) : null,
    });
  }

  await Invoice.insertMany(invoiceDocs);
  console.log(`   ✔  ${invoiceDocs.length} Invoices created.\n`);

  // ─── PHASE 10: COMPLAINTS ─────────────────────────────────
  console.log('⏳  Phase 9: Creating Complaints…');
  const COMPLAINT_CATEGORIES = [
    { category: 'Plumbing',      subCategory: 'Pipe Leakage',     department: 'Maintenance',    priority: 'High'   },
    { category: 'Electrical',    subCategory: 'Power Outage',      department: 'Maintenance',    priority: 'Critical'},
    { category: 'Housekeeping',  subCategory: 'Corridor Cleaning', department: 'Housekeeping',   priority: 'Low'    },
    { category: 'Security',      subCategory: 'Suspicious Person', department: 'Security',       priority: 'Critical'},
    { category: 'Lift/Elevator', subCategory: 'Lift Not Working',  department: 'Maintenance',    priority: 'High'   },
    { category: 'Pest Control',  subCategory: 'Cockroach Infestation', department: 'Housekeeping', priority: 'Medium' },
    { category: 'Parking',       subCategory: 'Unauthorized Vehicle',  department: 'Security',   priority: 'Medium' },
    { category: 'Noise',         subCategory: 'Late Night Music',  department: 'Admin',          priority: 'Low'    },
    { category: 'Internet',      subCategory: 'No Connectivity',   department: 'IT',             priority: 'Medium' },
    { category: 'Gas Pipeline',  subCategory: 'Gas Smell',         department: 'Maintenance',    priority: 'Critical'},
  ];
  const COMP_STATUSES = ['Open','Assigned','In Progress','Work Completed','Completed','Closed','Escalated'];
  const complaintDocs = [];
  let compNum = 1;

  // 60 complaints from first 30 residents
  const complaintResidents = [...usersCreated.owners.slice(0, 15), ...usersCreated.tenants.slice(0, 15)];
  for (const { user: u, unit } of complaintResidents) {
    const count = rndInt(1, 3);
    for (let j = 0; j < count && compNum <= 80; j++) {
      const cat = rnd(COMPLAINT_CATEGORIES);
      const st  = rnd(COMP_STATUSES);
      const asn = (st !== 'Open') ? rnd(usersCreated.managers) : null;
      complaintDocs.push({
        orgId:          org._id,
        complaintNumber:`GFC-${String(compNum).padStart(4,'0')}`,
        residentId:     u._id,
        residentName:   u.name,
        residentEmail:  u.email,
        residentMobile: u.phone,
        category:       cat.category,
        subCategory:    cat.subCategory,
        department:     cat.department,
        title:          `${cat.subCategory} issue in ${unit.unitNumber}`,
        description:    `Resident reported ${cat.subCategory.toLowerCase()} problem. Immediate attention required.`,
        priority:       cat.priority,
        location: {
          building:    unit.blockOrBuilding,
          flat:        unit.unitNumber,
          exactLocation: `${unit.unitNumber} – Main Area`,
        },
        status:          st,
        workflowStatus:  st === 'Open' ? 'Waiting For Assignment' : 'Assigned',
        assignedTechnicianId:   asn ? asn._id : null,
        assignedTechnicianName: asn ? asn.name : null,
        escalationLevel: st === 'Escalated' ? 1 : 0,
        preferredVisitDate: daysAhead(rndInt(1, 5)),
        preferredVisitTime: rnd(['Morning', 'Afternoon', 'Evening']),
        expectedSLA:     cat.priority === 'Critical' ? 'Immediate' : '48 Hours',
        timeline: [{
          status:   'Open',
          action:   'Complaint Created',
          userId:   u._id,
          userName: u.name,
          userRole: 'Resident',
          remarks:  'Submitted via portal.',
          date:     daysAgo(rndInt(1, 30)),
        }],
        statusHistory: [{ status: 'Open', timestamp: daysAgo(rndInt(1, 30)) }],
        createdBy: u._id,
        createdAt: daysAgo(rndInt(1, 30)),
      });
      compNum++;
    }
  }

  await Complaint.insertMany(complaintDocs);
  console.log(`   ✔  ${complaintDocs.length} Complaints created.\n`);

  // ─── PHASE 11: AMENITIES ──────────────────────────────────
  console.log('⏳  Phase 10: Creating Amenities…');
  const bookingRulesBase = {
    slotDurationMinutes:     60,
    bufferTimeMinutes:       15,
    openTime:                '06:00',
    closeTime:               '22:00',
    maxBookingsPerUserPerSlot: 2,
    advanceBookingDays:      7,
    minAdvanceBookingHours:  2,
    isCancellationEnabled:   true,
    weeklyOffDays:           [],
  };

  const amenityDefs = [
    { name: 'Swimming Pool',        type: 'pool',       capacity: 30, description: '25m outdoor swimming pool with lifeguard.',   pricing: { baseRate: 200, pricingType: 'hourly', taxPercentage: 5 } },
    { name: 'Fitness Center',       type: 'gym',        capacity: 20, description: 'State-of-the-art gym with cardio & weights.', pricing: { baseRate: 150, pricingType: 'session', taxPercentage: 5 } },
    { name: 'Badminton Court',      type: 'court',      capacity: 4,  description: 'Indoor badminton court with lighting.',        pricing: { baseRate: 300, pricingType: 'hourly', taxPercentage: 5 } },
    { name: 'Clubhouse Main Hall',  type: 'clubhouse',  capacity: 200,description: 'Grand hall for events and celebrations.',     pricing: { baseRate: 5000, pricingType: 'daily', taxPercentage: 18 } },
    { name: 'Rooftop Terrace',      type: 'hall',       capacity: 50, description: 'Open-air rooftop for casual gatherings.',     pricing: { baseRate: 1000, pricingType: 'session', taxPercentage: 5 } },
    { name: 'Co-Working Space',     type: 'Workspace',  capacity: 15, description: 'Quiet workspace with high-speed Wi-Fi.',      pricing: { baseRate: 100, pricingType: 'hourly', taxPercentage: 5 } },
    { name: 'Yoga & Wellness Room', type: 'Wellness',   capacity: 10, description: 'Dedicated space for yoga and meditation.',    pricing: { baseRate: 200, pricingType: 'session', taxPercentage: 5 } },
    { name: 'Kids Play Area',       type: 'other',      capacity: 25, description: 'Safe indoor play zone for children.',         pricing: { baseRate: 0, pricingType: 'fixed', taxPercentage: 0 } },
  ];

  const amenities = await Amenity.insertMany(
    amenityDefs.map(a => ({
      orgId:         org._id,
      name:          a.name,
      type:          a.type,
      description:   a.description,
      capacity:      a.capacity,
      pricing:       a.pricing,
      requiresApproval: a.name !== 'Kids Play Area',
      bookingRules:  bookingRulesBase,
      status:        'active',
    }))
  );
  console.log(`   ✔  ${amenities.length} Amenities created.\n`);

  // ─── PHASE 12: AMENITY BOOKINGS ───────────────────────────
  console.log('⏳  Phase 11: Creating Amenity Bookings…');
  const bookingDocs = [];
  const BOOK_STATUSES = ['pending','approved','confirmed','checked-in','completed','rejected','cancelled'];
  const allBooableUsers = [
    ...usersCreated.owners.map(o => o.user),
    ...usersCreated.tenants.map(t => t.user),
  ];

  // ~80 bookings spread across amenities
  for (let i = 0; i < 80; i++) {
    const user    = rnd(allBooableUsers);
    const amenity = rnd(amenities);
    const daysOffset = rndInt(-5, 10);
    const date    = new Date(Date.now() + daysOffset * 86_400_000);
    const dateStr = date.toISOString().split('T')[0];
    const startH  = rndInt(7, 19);
    const startTime = `${String(startH).padStart(2,'0')}:00`;
    const endTime   = `${String(startH + 1).padStart(2,'0')}:00`;
    const bkStatus  = daysOffset < 0 ? rnd(['completed','cancelled','checked-in']) : rnd(['pending','approved','confirmed']);

    bookingDocs.push({
      orgId:       org._id,
      amenityId:   amenity._id,
      userId:      user._id,
      bookingDate: dateStr,
      startTime,
      endTime,
      status:      bkStatus,
      bookingId:   `BK-${uuidv4().split('-')[0].toUpperCase()}`,
      pricingDetails: {
        baseAmount:   amenity.pricing.baseRate,
        taxAmount:    Math.round(amenity.pricing.baseRate * (amenity.pricing.taxPercentage / 100)),
        totalAmount:  Math.round(amenity.pricing.baseRate * (1 + amenity.pricing.taxPercentage / 100)),
      },
      paymentStatus: bkStatus === 'completed' ? 'success' : 'pending',
      paymentMethod: bkStatus === 'completed' ? 'UPI' : 'None',
      reviewedBy:    (bkStatus !== 'pending') ? rnd(usersCreated.managers)._id : null,
    });
  }

  await AmenityBooking.insertMany(bookingDocs);
  console.log(`   ✔  ${bookingDocs.length} Amenity Bookings created.\n`);

  // ─── PHASE 13: VISITOR PASSES ─────────────────────────────
  console.log('⏳  Phase 12: Creating Visitor Passes…');
  const PASS_TYPES   = ['GUEST', 'DELIVERY', 'CAB', 'SERVICE'];
  const PASS_STATUSES= ['ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING'];
  const visitorNames = [
    'Ramesh Pillai','Sunita Joshi','Mohan Das','Lakshmi Bai','Arvind Kulkarni',
    'Geeta Nair','Harish Anand','Poonam Shah','Suresh Bose','Anita Verma',
    'Manoj Tiwari','Rekha Ghosh','Vivek Reddy','Kavitha Rao','Deepak Mehta',
  ];
  const VEHICLE_NOS = ['KA01AB1234','MH12CD5678','TN09EF9012','DL3GH3456','GJ05IJ7890'];

  const visitorPassDocs = [];
  const passMakers = [
    ...usersCreated.owners.slice(0, 20).map(o => ({ user: o.user, unit: o.unit })),
    ...usersCreated.tenants.slice(0, 20).map(t => ({ user: t.user, unit: t.unit })),
  ];

  for (let i = 0; i < 60; i++) {
    const { user: u, unit } = rnd(passMakers);
    const pt    = rnd(PASS_TYPES);
    const pst   = rnd(PASS_STATUSES);
    const start = daysAgo(rndInt(0, 10));
    const end   = daysAhead(rndInt(0, 5));
    visitorPassDocs.push({
      orgId:       org._id,
      createdById: u._id,
      villaId:     unit._id,
      roleId:      roles['Security Guard']._id,
      passType:    pt,
      status:      pst,
      visitorDetails: {
        name:  rnd(visitorNames),
        phone: makePhone(1000 + i),
        idProofType: rnd(['Aadhaar', 'PAN', 'Passport', 'DL']),
        idProofNumber: `ID-${uuidv4().split('-')[0].toUpperCase()}`,
      },
      vehicleDetails: {
        vendor: pt === 'CAB' ? rnd(['Ola','Uber','Rapido']) : null,
        number: pt === 'CAB' ? rnd(VEHICLE_NOS) : null,
      },
      validity: {
        startDate:      start,
        endDate:        end,
        timeWindowStart:'09:00',
        timeWindowEnd:  '21:00',
        allowedDays:    [0, 1, 2, 3, 4, 5, 6],
      },
      usageLimit: {
        maxUses:     pt === 'GUEST' ? 1 : rndInt(2, 5),
        currentUses: pst === 'EXPIRED' ? rndInt(1, 3) : 0,
      },
    });
  }

  const passes = await VisitorPass.insertMany(visitorPassDocs);
  console.log(`   ✔  ${passes.length} Visitor Passes created.\n`);

  // ─── PHASE 14: VISITOR LOGS ───────────────────────────────
  console.log('⏳  Phase 13: Creating Visitor Logs…');
  const visitorLogDocs = [];
  const LOG_STATUSES = ['COMPLETED','INSIDE','REJECTED'];
  const ENTRY_TYPES  = ['PRE_APPROVED','WALK_IN'];

  for (let i = 0; i < 80; i++) {
    const guard  = rnd(usersCreated.guards);
    const pass   = rnd(passes.slice(0, 30));
    const et     = rnd(ENTRY_TYPES);
    const ls     = rnd(LOG_STATUSES);
    const checkIn = daysAgo(rndInt(0, 14));
    visitorLogDocs.push({
      orgId:     org._id,
      passId:    et === 'PRE_APPROVED' ? pass._id : null,
      guardId:   guard._id,
      residentId: rnd([...usersCreated.owners, ...usersCreated.tenants]).user._id,
      entryType: et,
      logStatus: ls,
      snapshot: {
        visitorName:   rnd(visitorNames),
        idProofNumber: `ID-${uuidv4().split('-')[0].toUpperCase()}`,
        vehicleNumber: Math.random() > 0.5 ? rnd(VEHICLE_NOS) : null,
      },
      checkInTime:  checkIn,
      checkOutTime: ls === 'COMPLETED' ? new Date(checkIn.getTime() + rndInt(30, 180) * 60_000) : null,
    });
  }

  await VisitorLog.insertMany(visitorLogDocs);
  console.log(`   ✔  ${visitorLogDocs.length} Visitor Logs created.\n`);

  // ─── PHASE 15: NOTICE BOARD ───────────────────────────────
  console.log('⏳  Phase 14: Creating Notice Board Posts…');
  const adminUser = usersCreated.admins[0];
  const noticeDocs = [
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '🏊 Pool Maintenance – 20 July 2026',
      description: 'The swimming pool will remain closed on 20th July 2026 for annual chlorination and tile maintenance. We apologize for the inconvenience.',
      category: 'Maintenance', priority: 'High', status: 'Published',
      expiryDate: daysAhead(10), isPinned: true,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '🎉 Independence Day Celebration – 15 August 2026',
      description: 'Greenfield Heights Community cordially invites all residents to the Independence Day celebration at the Clubhouse Main Hall at 8:00 AM.',
      category: 'Events', priority: 'Medium', status: 'Published',
      expiryDate: daysAhead(30), isPinned: true,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '⚡ Scheduled Power Outage – 18 July 2026 (Block B)',
      description: 'Electrical board maintenance scheduled for Block B apartments on 18 July between 10 AM – 2 PM. Generator backup will be available for common areas.',
      category: 'Emergency', priority: 'Critical', status: 'Published',
      expiryDate: daysAhead(3), isPinned: false,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '📋 Monthly AGM – 25 July 2026',
      description: 'Annual General Meeting for Q2 2026 financial review. Agenda: Budget approval, security upgrade proposal, amenity booking policy update.',
      category: 'Meetings', priority: 'High', status: 'Published',
      expiryDate: daysAhead(15), isPinned: false,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '🔧 Lift Inspection – Block C – 22 July 2026',
      description: 'Government-mandated elevator inspection for Block C lifts. Expected completion: 4 hours. Stairways accessible at all times.',
      category: 'Maintenance', priority: 'Medium', status: 'Scheduled',
      scheduleDate: daysAhead(6), expiryDate: daysAhead(20), isPinned: false,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '🚗 New Visitor Parking Policy',
      description: 'Effective 1 August 2026, visitor parking is limited to 2 hours per visit between 9 AM and 9 PM. Residents must pre-register visitors via the portal.',
      category: 'General', priority: 'Medium', status: 'Published',
      expiryDate: daysAhead(60), isPinned: false,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '🏋️ Fitness Center New Timings',
      description: 'Starting 1 August, the Fitness Center will be open 5 AM – 11 PM on weekdays and 6 AM – 10 PM on weekends. Personal trainers available on Sat & Sun.',
      category: 'General', priority: 'Low', status: 'Published',
      expiryDate: daysAhead(90), isPinned: false,
    },
    {
      orgId: org._id, createdBy: adminUser._id,
      title: '💧 Water Conservation Drive – July 2026',
      description: 'We are partnering with the local municipality for a water conservation initiative. Please report leakages immediately and avoid unnecessary usage between 2 PM – 5 PM.',
      category: 'General', priority: 'Low', status: 'Published',
      expiryDate: daysAhead(45), isPinned: false,
    },
  ];

  await Notice.insertMany(noticeDocs);
  console.log(`   ✔  ${noticeDocs.length} Notices created.\n`);

  // ─── PHASE 16: WALLETS ────────────────────────────────────
  console.log('⏳  Phase 15: Creating Wallets for bookable residents…');
  const walletDocs = [];
  const walletTxDocs = [];
  const walletUsers = [...usersCreated.owners.map(o => o.user), ...usersCreated.tenants.map(t => t.user)];

  for (const u of walletUsers) {
    const balance = rndInt(0, 5000);
    walletDocs.push({ orgId: org._id, userId: u._id, balance });
    if (balance > 0) {
      walletTxDocs.push({
        orgId:        org._id,
        userId:       u._id,
        transactionId:`TXN-${uuidv4().split('-')[0].toUpperCase()}`,
        type:         'Credit',
        amount:       balance,
        paymentMethod:'UPI',
        paymentStatus:'success',
        referenceType:'Other',
        description:  'Initial wallet top-up for testing.',
      });
    }
  }

  await Wallet.insertMany(walletDocs);
  await WalletTransaction.insertMany(walletTxDocs);
  console.log(`   ✔  ${walletDocs.length} Wallets & ${walletTxDocs.length} Transactions created.\n`);

  // ─── PHASE 17: EXCEL EXPORT ───────────────────────────────
  console.log('⏳  Phase 16: Generating Excel credentials file…');
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: User Credentials ──
  const wsUsers = XLSX.utils.json_to_sheet(credRows);
  XLSX.utils.book_append_sheet(wb, wsUsers, 'User Credentials');

  // ── Sheet 2: Roles Reference ──
  const roleRows = roleData.map(r => ({
    'Role Name':       r.name,
    'Is Tenant Role':  r.isTenantRole ? 'Yes' : 'No',
    'Description':     r.description,
    'Testing Focus':   r.name === 'Community Admin'
      ? 'Billing dashboard, user management, assessment config, RBAC, complaint routing, org settings.'
      : r.name === 'Facility Manager'
      ? 'Amenity CRUD, maintenance scheduling, complaint assignment, technician dispatch.'
      : r.name === 'Security Guard'
      ? 'Visitor pass scanning, walk-in entry, gate log management, visitor log review.'
      : r.name === 'Resident Owner'
      ? 'My financials, tenant arrears, visitor passes, amenity bookings, complaints submission, notices.'
      : r.name === 'Resident Tenant'
      ? 'Invoice view, offline payment submission, visitor passes, amenity bookings, complaints.'
      : 'Notices view, visitor pass read, limited profile access.',
  }));
  const wsRoles = XLSX.utils.json_to_sheet(roleRows);
  XLSX.utils.book_append_sheet(wb, wsRoles, 'Roles Reference');

  // ── Sheet 3: Units ──
  const refreshedUnits = await Villa.find({ orgId: org._id }).lean();
  const unitRows = refreshedUnits.map(u => ({
    'Unit Number':   u.unitNumber,
    'Block':         u.blockOrBuilding,
    'Type':          u.type,
    'Floor Area (sqft)': u.floorAreaSqFt || 'N/A',
    'Status':        u.status,
    'Resident Count': u.residents.length,
  }));
  const wsUnits = XLSX.utils.json_to_sheet(unitRows);
  XLSX.utils.book_append_sheet(wb, wsUnits, 'Units Overview');

  // ── Sheet 4: Testing Scenarios ──
  const scenarioRows = [
    { 'Scenario': 'SCEN-001', 'Actor': 'Community Admin', 'Feature': 'Billing Dashboard', 'Steps': '1. Login as admin.\n2. Navigate to Billing.\n3. Verify KPI cards (Total Due, Collected, Pending).\n4. Find VERIFICATION_PENDING invoice and click Settle.\n5. Check audit trail.' },
    { 'Scenario': 'SCEN-002', 'Actor': 'Community Admin', 'Feature': 'Assessment Management', 'Steps': '1. Login as admin.\n2. Go to Assessments.\n3. Create a new one-time special levy of ₹3,000 targeting Block C villas.\n4. Generate invoices.\n5. Verify invoices appear for affected units.' },
    { 'Scenario': 'SCEN-003', 'Actor': 'Community Admin', 'Feature': 'User Management & RBAC', 'Steps': '1. Login as admin.\n2. Go to User Management.\n3. Invite a new user.\n4. Assign Facility Manager role.\n5. Verify role permissions and login as new user.' },
    { 'Scenario': 'SCEN-004', 'Actor': 'Facility Manager', 'Feature': 'Amenity Management', 'Steps': '1. Login as Facility Manager.\n2. Go to Amenities.\n3. Add maintenance window to Swimming Pool (2 days).\n4. Attempt booking during that window — expect blocked.\n5. Approve a pending booking.' },
    { 'Scenario': 'SCEN-005', 'Actor': 'Facility Manager', 'Feature': 'Complaint Assignment', 'Steps': '1. Login as Facility Manager.\n2. Go to Complaints.\n3. Filter by status=Open.\n4. Assign a Critical complaint to a technician.\n5. Update status to In Progress.\n6. Verify timeline updates.' },
    { 'Scenario': 'SCEN-006', 'Actor': 'Security Guard', 'Feature': 'Visitor Management', 'Steps': '1. Login as Security Guard.\n2. Go to Visitor Logs.\n3. Scan or enter a PRE_APPROVED pass.\n4. Log entry (INSIDE).\n5. Later log exit (COMPLETED).\n6. Create a WALK_IN entry for unregistered visitor.' },
    { 'Scenario': 'SCEN-007', 'Actor': 'Resident Owner', 'Feature': 'My Financials & Tenant Arrears', 'Steps': '1. Login as any Resident Owner.\n2. Check outstanding invoice balance.\n3. View Tenant Arrears section.\n4. Confirm tenant pending payments are visible.\n5. Submit offline payment reference.' },
    { 'Scenario': 'SCEN-008', 'Actor': 'Resident Tenant', 'Feature': 'Invoice Settlement', 'Steps': '1. Login as any Resident Tenant.\n2. Go to My Financials.\n3. Find UNPAID invoice.\n4. Click "Pay via NEFT".\n5. Enter reference TXN-TEST001.\n6. Verify status changes to VERIFICATION_PENDING.\n7. Login as admin and verify + settle.' },
    { 'Scenario': 'SCEN-009', 'Actor': 'Resident Owner', 'Feature': 'Visitor Pass Creation', 'Steps': '1. Login as Owner.\n2. Navigate to Visitor Management.\n3. Create a new GUEST pass for family visit.\n4. Set valid dates and time window.\n5. Share pass link.\n6. Login as Guard and scan the pass.' },
    { 'Scenario': 'SCEN-010', 'Actor': 'Resident Owner/Tenant', 'Feature': 'Amenity Booking', 'Steps': '1. Login as Owner or Tenant.\n2. Navigate to Amenities.\n3. Select Swimming Pool.\n4. Book a 1-hour slot tomorrow at 7 AM.\n5. Verify booking appears as Pending.\n6. Login as Facility Manager and approve.\n7. Verify booking status → Confirmed.' },
    { 'Scenario': 'SCEN-011', 'Actor': 'Community Admin', 'Feature': 'Notice Board', 'Steps': '1. Login as admin.\n2. Go to Notice Board.\n3. Publish a new Emergency notice.\n4. Pin it to top.\n5. Login as resident and verify the pinned notice appears.' },
    { 'Scenario': 'SCEN-012', 'Actor': 'Resident Tenant', 'Feature': 'Complaint Submission', 'Steps': '1. Login as Tenant.\n2. Go to Complaints.\n3. Submit a Plumbing complaint with High priority.\n4. Attach location details.\n5. Verify complaint number generated (GFC-XXXX format).\n6. Track status updates via timeline.' },
  ];
  const wsScenarios = XLSX.utils.json_to_sheet(scenarioRows);
  XLSX.utils.book_append_sheet(wb, wsScenarios, 'Testing Scenarios');

  // ── Sheet 5: Summary Stats ──
  const summaryRows = [
    { 'Item': 'Organization Name',      'Count/Value': ORG_NAME },
    { 'Item': 'Total Roles Created',    'Count/Value': roleData.length },
    { 'Item': 'Total Users Created',    'Count/Value': credRows.length },
    { 'Item': '→ Community Admins',     'Count/Value': 2 },
    { 'Item': '→ Facility Managers',    'Count/Value': 3 },
    { 'Item': '→ Security Guards',      'Count/Value': 5 },
    { 'Item': '→ Resident Owners',      'Count/Value': 30 },
    { 'Item': '→ Resident Tenants',     'Count/Value': 40 },
    { 'Item': '→ Family Members',       'Count/Value': 20 },
    { 'Item': 'Total Units Created',    'Count/Value': units.length },
    { 'Item': '→ Studio Units',         'Count/Value': 10 },
    { 'Item': '→ Apartment Units',      'Count/Value': 25 },
    { 'Item': '→ Villa Units',          'Count/Value': 30 },
    { 'Item': '→ Penthouse Units',      'Count/Value': 15 },
    { 'Item': 'OrgMemberships',         'Count/Value': memberships.length },
    { 'Item': 'Assessments',            'Count/Value': assessments.length },
    { 'Item': 'Invoices Generated',     'Count/Value': invoiceDocs.length },
    { 'Item': 'Complaints Filed',       'Count/Value': complaintDocs.length },
    { 'Item': 'Amenities Created',      'Count/Value': amenities.length },
    { 'Item': 'Amenity Bookings',       'Count/Value': bookingDocs.length },
    { 'Item': 'Visitor Passes',         'Count/Value': visitorPassDocs.length },
    { 'Item': 'Visitor Logs',           'Count/Value': visitorLogDocs.length },
    { 'Item': 'Notice Board Posts',     'Count/Value': noticeDocs.length },
    { 'Item': 'Wallets Created',        'Count/Value': walletDocs.length },
    { 'Item': 'Default Password (all)', 'Count/Value': PASSWORD },
    { 'Item': 'Seed Date',              'Count/Value': new Date().toISOString() },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Seed Summary');

  // ── Apply column widths ──
  const setColWidths = (ws, widths) => {
    ws['!cols'] = widths.map(w => ({ wch: w }));
  };
  setColWidths(wsUsers, [6, 18, 22, 22, 30, 14, 20, 20, 16, 20, 10, 50, 60]);
  setColWidths(wsRoles, [22, 15, 60, 80]);
  setColWidths(wsUnits, [15, 30, 14, 18, 12, 15]);
  setColWidths(wsScenarios, [12, 22, 30, 100]);
  setColWidths(wsSummary, [35, 25]);

  const outPath = path.join(__dirname, 'Community_Testing_Credentials_v2.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`   ✔  Excel file saved: ${outPath}\n`);

  await mongoose.disconnect();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        SEED COMPLETE — ALL DONE! 🎉       ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`📋  Total Users : ${credRows.length}`);
  console.log(`🏠  Total Units : ${units.length}`);
  console.log(`📄  Total Invoices: ${invoiceDocs.length}`);
  console.log(`🔑  Default Password: ${PASSWORD}\n`);
}

seed().catch((err) => {
  console.error('❌ SEED FAILED:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
