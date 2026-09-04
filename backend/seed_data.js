import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

// Import Models
import Organization from './src/features/organization/organization.model.js';
import Role from './src/features/role/role.model.js';
import User from './src/features/user/user.model.js';
import Villa from './src/features/villa/villa.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Assessment from './src/features/assessment/assessment.model.js';
import Invoice from './src/features/invoice/invoice.model.js';

async function seed() {
  console.log(`Connecting to database: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully!');

  // --- 1. Clean Up Previous Test Data ---
  console.log('Cleaning up previous seed data...');
  const testEmails = [
    'admin@mygate.com',
    'owner1@mygate.com',
    'owner2@mygate.com',
    'tenant1@mygate.com',
    'tenant2@mygate.com',
    'guard1@mygate.com'
  ];

  // Find users first to get their IDs for related mappings
  const existingUsers = await User.find({ email: { $in: testEmails } });
  const userIds = existingUsers.map(u => u._id);

  await Invoice.deleteMany({ targetUserId: { $in: userIds } });
  
  // Find and delete assessments associated with the organization we will create/use
  let org = await Organization.findOne({ name: 'Srihariparthasarathi Community' });
  if (org) {
    await Assessment.deleteMany({ communityId: org._id });
    await Villa.deleteMany({ orgId: org._id });
    await OrgMembership.deleteMany({ orgId: org._id });
    await Role.deleteMany({ orgId: org._id });
    await Organization.deleteOne({ _id: org._id });
  }
  
  await User.deleteMany({ email: { $in: testEmails } });
  console.log('Clean up complete.');

  // --- 2. Create Organization / Community ---
  console.log('Creating Organization...');
  org = await Organization.create({
    name: 'Srihariparthasarathi Community',
    status: 'Active',
    organizationType: 'Residential',
    allowedFeatures: ['billing', 'villas', 'visitor', 'complaints', 'amenities'],
    isPlatform: false
  });
  console.log(`Created Organization: ${org.name} (${org._id})`);

  // --- 3. Create Roles (Renamed to match setupWorkspace exactly) ---
  console.log('Creating Roles...');
  const roleAdmin = await Role.create({
    name: 'Community Admin',
    orgId: org._id,
    description: 'Community Administrator with full billing privileges',
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
  console.log('Roles created successfully.');

  // --- 4. Create Users ---
  console.log('Creating Users (Hashing Passwords)...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Test@1234', salt);
  const adminHashedPassword = await bcrypt.hash('Test@1234', salt);

  const adminUser = await User.create({
    email: 'admin@mygate.com',
    username: 'admin',
    password: adminHashedPassword,
    status: 'Active',
    name: 'Community Admin',
    phone: '+919999999991',
    roles: [roleAdmin._id],
    residencyType: 'None'
  });

  const owner1User = await User.create({
    email: 'owner1@mygate.com',
    username: 'owner1',
    password: hashedPassword,
    status: 'Active',
    name: 'Rajesh Kumar (Owner 1)',
    phone: '+919999999992',
    roles: [roleOwner._id],
    residencyType: 'Resident Owner'
  });

  const owner2User = await User.create({
    email: 'owner2@mygate.com',
    username: 'owner2',
    password: hashedPassword,
    status: 'Active',
    name: 'Vikram Singh (Owner 2)',
    phone: '+919999999993',
    roles: [roleOwner._id],
    residencyType: 'Resident Owner'
  });

  const tenant1User = await User.create({
    email: 'tenant1@mygate.com',
    username: 'tenant1',
    password: hashedPassword,
    status: 'Active',
    name: 'Rahul Mehta (Tenant 1)',
    phone: '+919999999994',
    roles: [roleTenant._id],
    residencyType: 'Tenant'
  });

  const tenant2User = await User.create({
    email: 'tenant2@mygate.com',
    username: 'tenant2',
    password: hashedPassword,
    status: 'Active',
    name: 'Aisha Khan (Tenant 2)',
    phone: '+919999999995',
    roles: [roleTenant._id],
    residencyType: 'Tenant'
  });

  const guardUser = await User.create({
    email: 'guard1@mygate.com',
    username: 'guard1',
    password: hashedPassword,
    status: 'Active',
    name: 'Bahadur Singh (Guard 1)',
    phone: '+919999999996',
    roles: [roleGuard._id],
    residencyType: 'Staff'
  });
  console.log('Users created successfully.');

  // --- 5. Create Villas & Unit Assignments ---
  console.log('Creating Villas & Assignments...');
  
  // Villa A-101: Owner 1 resides here
  const villaA101 = await Villa.create({
    orgId: org._id,
    unitNumber: 'Villa A-101',
    blockOrBuilding: 'Block A',
    type: 'Villa',
    status: 'Occupied',
    primaryResidentId: owner1User._id,
    residents: [
      { userId: owner1User._id, residencyType: 'Resident Owner', isPrimary: true }
    ]
  });

  // Villa A-102: Owned by Owner 2, Leased to Tenant 1
  const villaA102 = await Villa.create({
    orgId: org._id,
    unitNumber: 'Villa A-102',
    blockOrBuilding: 'Block A',
    type: 'Villa',
    status: 'Occupied',
    primaryResidentId: tenant1User._id,
    residents: [
      { userId: owner2User._id, residencyType: 'Non-Resident Owner', isPrimary: false },
      { userId: tenant1User._id, residencyType: 'Tenant', isPrimary: true }
    ]
  });

  // Villa B-201: Owned by Owner 1, Leased to Tenant 2
  const villaB201 = await Villa.create({
    orgId: org._id,
    unitNumber: 'Villa B-201',
    blockOrBuilding: 'Block B',
    type: 'Villa',
    status: 'Occupied',
    primaryResidentId: tenant2User._id,
    residents: [
      { userId: owner1User._id, residencyType: 'Non-Resident Owner', isPrimary: false },
      { userId: tenant2User._id, residencyType: 'Tenant', isPrimary: true }
    ]
  });

  // Update Users with their assigned VillaIds
  await User.updateOne({ _id: owner1User._id }, { $set: { villaId: villaA101._id } });
  await User.updateOne({ _id: tenant1User._id }, { $set: { villaId: villaA102._id } });
  await User.updateOne({ _id: tenant2User._id }, { $set: { villaId: villaB201._id } });
  console.log('Villas and assignments created.');

  // --- 6. Create OrgMemberships ---
  console.log('Creating Org Memberships...');
  await OrgMembership.create([
    { userId: adminUser._id, orgId: org._id, roleId: roleAdmin._id, roleIds: [roleAdmin._id], residentType: 'None' },
    { userId: owner1User._id, orgId: org._id, roleId: roleOwner._id, roleIds: [roleOwner._id], villaId: villaA101._id, residentType: 'Owner' },
    { userId: owner2User._id, orgId: org._id, roleId: roleOwner._id, roleIds: [roleOwner._id], villaId: villaA102._id, residentType: 'Owner' },
    { userId: tenant1User._id, orgId: org._id, roleId: roleTenant._id, roleIds: [roleTenant._id], villaId: villaA102._id, residentType: 'Tenant' },
    { userId: tenant2User._id, orgId: org._id, roleId: roleTenant._id, roleIds: [roleTenant._id], villaId: villaB201._id, residentType: 'Tenant' },
    { userId: guardUser._id, orgId: org._id, roleId: roleGuard._id, roleIds: [roleGuard._id], residentType: 'None' }
  ]);
  console.log('Memberships synchronized.');

  // --- 7. Create Assessments & Templates ---
  console.log('Creating Assessment Templates...');
  const assessmentMaintenance = await Assessment.create({
    communityId: org._id,
    name: 'Monthly Maintenance July 2026',
    type: 'RECURRING',
    billingCycle: 'MONTHLY',
    generationDay: 1,
    targetScope: {
      type: 'ALL_COMMUNITY',
      targetRole: 'BOTH',
      targetRoleIds: [roleOwner._id, roleTenant._id]
    },
    calculationMethod: {
      type: 'FLAT_RATE',
      flatAmount: 7000
    },
    isActive: true
  });

  const assessmentSecurity = await Assessment.create({
    communityId: org._id,
    name: 'Security Fund 2026',
    type: 'ONE_TIME',
    billingCycle: 'AD_HOC',
    generationDay: 1,
    targetScope: {
      type: 'ALL_COMMUNITY',
      targetRole: 'BOTH'
    },
    calculationMethod: {
      type: 'FLAT_RATE',
      flatAmount: 5000
    },
    isActive: true
  });
  console.log('Assessment templates saved.');

  // --- 8. Create Invoices ---
  console.log('Creating Invoices...');
  
  // Invoice 1: Owner 1 (Villa A-101) - PAID Maintenance
  const invoice1 = await Invoice.create({
    communityId: org._id,
    orgId: org._id,
    assessmentId: assessmentMaintenance._id,
    targetUserId: owner1User._id,
    unitId: villaA101._id,
    billingPeriodString: '2026-07',
    currentCharge: 7000,
    totalAmount: 7000,
    paidAmount: 7000,
    outstandingAmount: 0,
    hardcodedAmount: 7000,
    taxAmount: 0,
    totalDue: 7000,
    dueDate: new Date('2026-07-31'),
    status: 'PAID',
    paymentMethod: 'UPI',
    paid_at: new Date('2026-07-02'),
    settled_at: new Date('2026-07-02')
  });

  // Invoice 2: Owner 1 (Villa A-101) - UNPAID Security Fund
  const invoice2 = await Invoice.create({
    communityId: org._id,
    orgId: org._id,
    assessmentId: assessmentSecurity._id,
    targetUserId: owner1User._id,
    unitId: villaA101._id,
    billingPeriodString: '2026-07',
    currentCharge: 5000,
    totalAmount: 5000,
    paidAmount: 0,
    outstandingAmount: 5000,
    hardcodedAmount: 5000,
    taxAmount: 0,
    totalDue: 5000,
    dueDate: new Date('2026-07-31'),
    status: 'UNPAID'
  });

  // Invoice 3: Tenant 1 (Villa A-102) - UNPAID Maintenance (Owner 2 sees under Tenant Arrears)
  const invoice3 = await Invoice.create({
    communityId: org._id,
    orgId: org._id,
    assessmentId: assessmentMaintenance._id,
    targetUserId: tenant1User._id,
    unitId: villaA102._id,
    billingPeriodString: '2026-07',
    currentCharge: 7000,
    totalAmount: 7000,
    paidAmount: 0,
    outstandingAmount: 7000,
    hardcodedAmount: 7000,
    taxAmount: 0,
    totalDue: 7000,
    dueDate: new Date('2026-07-31'),
    status: 'UNPAID'
  });

  // Invoice 4: Tenant 2 (Villa B-201) - PENDING Bank Transfer Verification
  const invoice4 = await Invoice.create({
    communityId: org._id,
    orgId: org._id,
    assessmentId: assessmentMaintenance._id,
    targetUserId: tenant2User._id,
    unitId: villaB201._id,
    billingPeriodString: '2026-07',
    currentCharge: 7000,
    totalAmount: 7000,
    paidAmount: 0,
    outstandingAmount: 7000,
    hardcodedAmount: 7000,
    taxAmount: 0,
    totalDue: 7000,
    dueDate: new Date('2026-07-31'),
    status: 'VERIFICATION_PENDING',
    paymentMethod: 'BANK_TRANSFER',
    offlineReference: 'BANK-118274'
  });

  console.log('Invoices successfully generated and linked.');

  // --- 9. Generate Excel File with Credentials ---
  console.log('Generating Excel File...');

  const credentialsData = [
    {
      'Role / Type': 'Community Admin',
      'Name': 'Community Admin',
      'Username': 'admin',
      'Email': 'admin@mygate.com',
      'Password': 'Test@1234',
      'Assigned Unit': 'N/A',
      'Residency Type': 'None',
      'Testing Context': 'Manage assessments, view ledger, verify offline cheque payments.'
    },
    {
      'Role / Type': 'Resident Owner',
      'Name': 'Rajesh Kumar (Owner 1)',
      'Username': 'owner1',
      'Email': 'owner1@mygate.com',
      'Password': 'Test@1234',
      'Assigned Unit': 'Villa A-101',
      'Residency Type': 'Resident Owner',
      'Testing Context': 'View ₹5,000 outstanding security fund invoice. View Tenant Arrears (Tenant 2 clearing Cheque ₹7,000).'
    },
    {
      'Role / Type': 'Resident Owner (Non-Res)',
      'Name': 'Vikram Singh (Owner 2)',
      'Username': 'owner2',
      'Email': 'owner2@mygate.com',
      'Password': 'Test@1234',
      'Assigned Unit': 'Villa A-102 (Leased)',
      'Residency Type': 'Non-Resident Owner',
      'Testing Context': 'View Tenant Arrears (Tenant 1 outstanding Maintenance ₹7,000).'
    },
    {
      'Role / Type': 'Resident Tenant',
      'Name': 'Rahul Mehta (Tenant 1)',
      'Username': 'tenant1',
      'Email': 'tenant1@mygate.com',
      'Password': 'Test@1234',
      'Assigned Unit': 'Villa A-102',
      'Residency Type': 'Tenant',
      'Testing Context': 'View ₹7,000 outstanding maintenance invoice. Submit offline NEFT/Cheque pay ref.'
    },
    {
      'Role / Type': 'Resident Tenant',
      'Name': 'Aisha Khan (Tenant 2)',
      'Username': 'tenant2',
      'Email': 'tenant2@mygate.com',
      'Password': 'Test@1234',
      'Assigned Unit': 'Villa B-201',
      'Residency Type': 'Tenant',
      'Testing Context': 'View ₹7,000 invoice currently in VERIFICATION_PENDING status.'
    },
    {
      'Role / Type': 'Security Guard',
      'Name': 'Bahadur Singh (Guard 1)',
      'Username': 'guard1',
      'Email': 'guard1@mygate.com',
      'Password': 'Test@1234',
      'Assigned Unit': 'Gate Entrance',
      'Residency Type': 'None',
      'Testing Context': 'Gate checkpoint control (visitor scanner, log book).'
    }
  ];

  const unitsData = [
    {
      'Unit Number': 'Villa A-101',
      'Block': 'Block A',
      'Type': 'Villa',
      'Status': 'Occupied',
      'Primary Resident': 'Rajesh Kumar (Owner 1)',
      'Owner': 'Rajesh Kumar (Owner 1)',
      'Current Invoices': 'INV-2026-07-001 (Paid: ₹7,000), INV-2026-07-002 (Unpaid: ₹5,000)'
    },
    {
      'Unit Number': 'Villa A-102',
      'Block': 'Block A',
      'Type': 'Villa',
      'Status': 'Occupied',
      'Primary Resident': 'Rahul Mehta (Tenant 1)',
      'Owner': 'Vikram Singh (Owner 2)',
      'Current Invoices': 'INV-2026-07-003 (Unpaid: ₹7,000)'
    },
    {
      'Unit Number': 'Villa B-201',
      'Block': 'Block B',
      'Type': 'Villa',
      'Status': 'Occupied',
      'Primary Resident': 'Aisha Khan (Tenant 2)',
      'Owner': 'Rajesh Kumar (Owner 1)',
      'Current Invoices': 'INV-2026-07-004 (Verification Pending: ₹7,000)'
    }
  ];

  const scenariosData = [
    {
      'Scenario ID': 'SCEN-001',
      'Target Role': 'Community Admin',
      'Feature Tested': 'Admin Ledger & Verification',
      'Action Steps': '1. Login as admin.\n2. Navigate to "Billing" tab.\n3. Observe overall KPIs matching database entries.\n4. Search for Villa B-201 and click "Settle" or "Mark Paid" to reconcile Cheque reference CHQ-118274.'
    },
    {
      'Scenario ID': 'SCEN-002',
      'Target Role': 'Resident Owner (owner1)',
      'Feature Tested': 'My Financials & Tenant Arrears',
      'Action Steps': '1. Login as owner1.\n2. Go to "My Financials" / Resident Action Center.\n3. Check outstanding balance of ₹5,000.\n4. Look at Tenant Arrears list to see Tenant 2 (Aisha) with ₹7,000 in Pending status.'
    },
    {
      'Scenario ID': 'SCEN-003',
      'Target Role': 'Resident Tenant (tenant1)',
      'Feature Tested': 'Outstanding Balance & Pay Now Trigger',
      'Action Steps': '1. Login as tenant1.\n2. Go to "My Financials".\n3. Check outstanding balance of ₹7,000.\n4. Click "Pay Now" and enter a reference code (e.g. "TXN-8827A") to submit settlement.\n5. Log back as admin and verify if status changes to VERIFICATION_PENDING with reference.'
    }
  ];

  const wb = XLSX.utils.book_new();
  const wsCredentials = XLSX.utils.json_to_sheet(credentialsData);
  const wsUnits = XLSX.utils.json_to_sheet(unitsData);
  const wsScenarios = XLSX.utils.json_to_sheet(scenariosData);

  XLSX.utils.book_append_sheet(wb, wsCredentials, 'User Credentials');
  XLSX.utils.book_append_sheet(wb, wsUnits, 'Villas & Units');
  XLSX.utils.book_append_sheet(wb, wsScenarios, 'Testing Scenarios');

  const filename = 'Community_Testing_Credentials.xlsx';
  const filePath = path.join(process.cwd(), filename);

  XLSX.writeFile(wb, filePath);
  console.log(`Excel file created successfully at: ${filePath}`);

  await mongoose.disconnect();
  console.log('Seeding complete. Disconnected from DB.');
}

seed().catch(console.error);
