import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

// Import Models
import Organization from '../features/organization/organization.model.js';
import User from '../features/user/user.model.js';
import Role from '../features/role/role.model.js';
import Villa from '../features/villa/villa.model.js';
import OrgMembership from '../features/orgMembership/orgMembership.model.js';
import Assessment from '../features/assessment/assessment.model.js';
import Invoice from '../features/invoice/invoice.model.js';

const daysAgo = (d) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d) => new Date(Date.now() + d * 86_400_000);

export async function seedBillingLedgers() {
  console.log(`[SEED] Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[SEED] Connected successfully.');

  const naveenUser = await User.findOne({ email: 'naveen@atominosconsulting.com' });
  const naveen2User = await User.findOne({ email: 'naveenpv5886@gmail.com' });

  if (!naveenUser) {
    console.error('Naveen user not found!');
    process.exit(1);
  }

  const targetOrgNames = ['Sovereign Gates', 'Nested Community', 'Neasted Community', 'Nexus Community'];
  const targetOrgs = await Organization.find({ name: { $in: targetOrgNames } });

  console.log(`[SEED] Found ${targetOrgs.length} target organizations to seed.`);

  for (const org of targetOrgs) {
    const orgId = org._id;
    console.log(`\n========================================`);
    console.log(`[SEED] Processing Organization: ${org.name} (${orgId})`);

    // 1. Roles
    const adminRole = await Role.findOne({ orgId, name: 'Community Admin' }) ||
      await Role.findOne({ orgId, isTenantRole: false });
    const ownerRole = await Role.findOne({ orgId, name: 'Resident Owner' }) ||
      await Role.findOne({ orgId, isTenantRole: true });
    const tenantRole = await Role.findOne({ orgId, name: 'Resident Tenant' });

    // 2. Ensure Villas exist (101, 102, 103, 104)
    const unitNumbers = ['101', '102', '103', '104'];
    const existingVillas = await Villa.find({ orgId });
    const villaMap = new Map();
    existingVillas.forEach(v => villaMap.set(v.unitNumber, v));

    for (const uNum of unitNumbers) {
      if (!villaMap.has(uNum)) {
        const isVilla101 = uNum === '101';
        const isVilla102 = uNum === '102';
        const primaryId = isVilla101 ? naveenUser._id : (isVilla102 && naveen2User ? naveen2User._id : null);
        const newVilla = await Villa.create({
          orgId,
          communityId: orgId,
          unitNumber: uNum,
          blockOrBuilding: 'Block A',
          floor: '1',
          type: 'BHK3',
          floorAreaSqFt: 1500,
          status: primaryId ? 'Occupied' : 'Vacant',
          ownerId: primaryId,
          primaryResidentId: primaryId,
          residents: primaryId ? [{ userId: primaryId, residencyType: 'Owner', isPrimary: true }] : [],
        });
        villaMap.set(uNum, newVilla);
        console.log(`  + Created Villa ${uNum} (${newVilla._id})`);
      }
    }

    const villa101 = villaMap.get('101');
    const villa102 = villaMap.get('102');

    // 3. Ensure OrgMembership for Naveen with villa101
    let naveenMembership = await OrgMembership.findOne({ userId: naveenUser._id, orgId });
    if (naveenMembership) {
      if (!naveenMembership.villaId && villa101) {
        naveenMembership.villaId = villa101._id;
        naveenMembership.residentType = 'Owner';
        await naveenMembership.save();
        console.log(`  * Updated Naveen membership with Villa 101`);
      }
    } else {
      naveenMembership = await OrgMembership.create({
        userId: naveenUser._id,
        orgId,
        roleId: adminRole?._id,
        roleIds: [adminRole?._id, ownerRole?._id].filter(Boolean),
        villaId: villa101?._id || null,
        residentType: 'Owner',
        status: 'Active',
      });
      console.log(`  + Created Naveen membership in ${org.name}`);
    }

    // Ensure Naveen 2 membership if available
    if (naveen2User) {
      let naveen2Membership = await OrgMembership.findOne({ userId: naveen2User._id, orgId });
      if (!naveen2Membership) {
        naveen2Membership = await OrgMembership.create({
          userId: naveen2User._id,
          orgId,
          roleId: ownerRole?._id || adminRole?._id,
          roleIds: [ownerRole?._id].filter(Boolean),
          villaId: villa102?._id || null,
          residentType: 'Tenant',
          status: 'Active',
        });
        console.log(`  + Created Naveen 2 membership in ${org.name}`);
      }
    }

    // 4. Ensure Assessments exist
    let assessments = await Assessment.find({ communityId: orgId });
    if (assessments.length === 0) {
      const createdAssessments = await Assessment.insertMany([
        {
          communityId: orgId,
          name: 'Monthly Maintenance Fee',
          type: 'RECURRING',
          billingCycle: 'MONTHLY',
          generationDay: 1,
          carryForwardEnabled: true,
          calculationMethod: { type: 'FLAT_RATE', flatAmount: 5000 },
          targetScope: { type: 'ALL_COMMUNITY', targetRole: 'BOTH' },
        },
        {
          communityId: orgId,
          name: 'Security & Infrastructure Sinking Fund',
          type: 'ONE_TIME',
          billingCycle: 'QUARTERLY',
          generationDay: 1,
          carryForwardEnabled: true,
          calculationMethod: { type: 'FLAT_RATE', flatAmount: 10000 },
          targetScope: { type: 'ALL_COMMUNITY', targetRole: 'OWNER' },
        },
        {
          communityId: orgId,
          name: 'Clubhouse & Water Utility Assessment',
          type: 'RECURRING',
          billingCycle: 'MONTHLY',
          generationDay: 5,
          carryForwardEnabled: true,
          calculationMethod: { type: 'FLAT_RATE', flatAmount: 3500 },
          targetScope: { type: 'ALL_COMMUNITY', targetRole: 'BOTH' },
        },
      ]);
      assessments = createdAssessments;
      console.log(`  + Created ${assessments.length} Assessments`);
    }

    const [asnMaint, asnSecurity, asnWater] = assessments;

    // 5. Invoices check
    const existingInvoicesCount = await Invoice.countDocuments({
      $or: [{ communityId: orgId }, { orgId: orgId }]
    });

    console.log(`  Current invoices count: ${existingInvoicesCount}`);

    if (existingInvoicesCount < 5) {
      console.log(`  Seeding comprehensive billing ledger invoices for ${org.name}...`);

      const residentUser1 = naveenUser;
      const residentUser2 = naveen2User || naveenUser;

      const invoicePayloads = [
        // 1. UNPAID Invoice (Maintenance) for Naveen
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-001`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnMaint._id,
          targetUserId: residentUser1._id,
          unitId: villa101?._id || villaMap.get('101')._id,
          billingPeriodString: '2026-09',
          currentCharge: 5000,
          totalAmount: 5000,
          outstandingAmount: 5000,
          paidAmount: 0,
          hardcodedAmount: 5000,
          taxAmount: 0,
          totalDue: 5000,
          dueDate: daysAhead(10),
          status: 'UNPAID',
          paymentMethod: null,
          snapshot: {
            assessmentName: asnMaint.name || 'Monthly Maintenance Fee',
            unitDetails: { unitNumber: '101', block: 'Block A' },
            residentDetails: { name: residentUser1.name || residentUser1.username, email: residentUser1.email },
          },
          createdAt: daysAgo(2),
        },

        // 2. VERIFICATION_PENDING Invoice (Cash Submitted) for Naveen
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-002`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnSecurity ? asnSecurity._id : asnMaint._id,
          targetUserId: residentUser1._id,
          unitId: villa101?._id || villaMap.get('101')._id,
          billingPeriodString: '2026-09',
          currentCharge: 10000,
          totalAmount: 10000,
          outstandingAmount: 10000,
          paidAmount: 0,
          hardcodedAmount: 10000,
          taxAmount: 0,
          totalDue: 10000,
          dueDate: daysAhead(15),
          status: 'VERIFICATION_PENDING',
          paymentMethod: 'CASH',
          offlineReference: `CASH-REQ-${Date.now().toString().slice(-4)}`,
          offlineAmount: 10000,
          snapshot: {
            assessmentName: asnSecurity?.name || 'Security Sinking Fund',
            unitDetails: { unitNumber: '101', block: 'Block A' },
            residentDetails: { name: residentUser1.name || residentUser1.username, email: residentUser1.email },
          },
          createdAt: daysAgo(1),
        },

        // 3. VERIFICATION_PENDING Invoice (Bank Transfer Submitted) for Resident 2
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-003`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnMaint._id,
          targetUserId: residentUser2._id,
          unitId: villa102?._id || villaMap.get('102')._id,
          billingPeriodString: '2026-09',
          currentCharge: 5000,
          totalAmount: 5000,
          outstandingAmount: 5000,
          paidAmount: 0,
          hardcodedAmount: 5000,
          taxAmount: 0,
          totalDue: 5000,
          dueDate: daysAhead(12),
          status: 'VERIFICATION_PENDING',
          paymentMethod: 'BANK_TRANSFER',
          offlineReference: `BANK-TRF-${Date.now().toString().slice(-4)}`,
          offlineAmount: 5000,
          snapshot: {
            assessmentName: asnMaint.name || 'Monthly Maintenance Fee',
            unitDetails: { unitNumber: '102', block: 'Block A' },
            residentDetails: { name: residentUser2.name || residentUser2.username, email: residentUser2.email },
          },
          createdAt: daysAgo(1),
        },

        // 4. PARTIALLY_PAID Invoice
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-004`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnWater ? asnWater._id : asnMaint._id,
          targetUserId: residentUser1._id,
          unitId: villa101?._id || villaMap.get('101')._id,
          billingPeriodString: '2026-09',
          currentCharge: 3500,
          totalAmount: 3500,
          outstandingAmount: 1500,
          paidAmount: 2000,
          hardcodedAmount: 3500,
          taxAmount: 0,
          totalDue: 3500,
          dueDate: daysAhead(20),
          status: 'PARTIALLY_PAID',
          paymentMethod: 'CASH',
          offlineReference: `CASH-RCPT-${Date.now().toString().slice(-4)}`,
          offlineAmount: 2000,
          paid_at: daysAgo(3),
          snapshot: {
            assessmentName: asnWater?.name || 'Clubhouse & Water Utility Assessment',
            unitDetails: { unitNumber: '101', block: 'Block A' },
            residentDetails: { name: residentUser1.name || residentUser1.username, email: residentUser1.email },
          },
          createdAt: daysAgo(5),
        },

        // 5. OVERDUE Invoice
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-005`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnMaint._id,
          targetUserId: residentUser2._id,
          unitId: villa102?._id || villaMap.get('102')._id,
          billingPeriodString: '2026-08',
          currentCharge: 5000,
          totalAmount: 5000,
          outstandingAmount: 5000,
          paidAmount: 0,
          hardcodedAmount: 5000,
          taxAmount: 0,
          totalDue: 5000,
          dueDate: daysAgo(10),
          status: 'OVERDUE',
          paymentMethod: null,
          snapshot: {
            assessmentName: asnMaint.name || 'August Maintenance Fee',
            unitDetails: { unitNumber: '102', block: 'Block A' },
            residentDetails: { name: residentUser2.name || residentUser2.username, email: residentUser2.email },
          },
          createdAt: daysAgo(30),
        },

        // 6. PAID Invoice (Online Gateway)
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-006`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnMaint._id,
          targetUserId: residentUser1._id,
          unitId: villa101?._id || villaMap.get('101')._id,
          billingPeriodString: '2026-08',
          currentCharge: 5000,
          totalAmount: 5000,
          outstandingAmount: 0,
          paidAmount: 5000,
          hardcodedAmount: 5000,
          taxAmount: 0,
          totalDue: 5000,
          dueDate: daysAgo(5),
          status: 'PAID',
          paymentMethod: 'RAZORPAY',
          offlineReference: `pay_${uuidv4().replace(/-/g, '').slice(0, 14)}`,
          paid_at: daysAgo(15),
          settled_at: daysAgo(14),
          snapshot: {
            assessmentName: asnMaint.name || 'August Maintenance Fee',
            unitDetails: { unitNumber: '101', block: 'Block A' },
            residentDetails: { name: residentUser1.name || residentUser1.username, email: residentUser1.email },
          },
          createdAt: daysAgo(30),
        },

        // 7. PAID Invoice (Cash Cleared)
        {
          invoiceNumber: `INV-${org.name.slice(0, 3).toUpperCase()}-2026-007`,
          communityId: orgId,
          orgId: orgId,
          assessmentId: asnSecurity ? asnSecurity._id : asnMaint._id,
          targetUserId: residentUser2._id,
          unitId: villa102?._id || villaMap.get('102')._id,
          billingPeriodString: '2026-08',
          currentCharge: 10000,
          totalAmount: 10000,
          outstandingAmount: 0,
          paidAmount: 10000,
          hardcodedAmount: 10000,
          taxAmount: 0,
          totalDue: 10000,
          dueDate: daysAgo(5),
          status: 'PAID',
          paymentMethod: 'CASH',
          offlineReference: `CASH-PAID-${Date.now().toString().slice(-4)}`,
          offlineAmount: 10000,
          paid_at: daysAgo(10),
          settled_at: daysAgo(10),
          snapshot: {
            assessmentName: asnSecurity?.name || 'Security Sinking Fund',
            unitDetails: { unitNumber: '102', block: 'Block A' },
            residentDetails: { name: residentUser2.name || residentUser2.username, email: residentUser2.email },
          },
          createdAt: daysAgo(30),
        },
      ];

      await Invoice.insertMany(invoicePayloads);
      console.log(`  + Inserted ${invoicePayloads.length} diverse invoices for ${org.name}`);
    } else {
      console.log(`  ✓ Organization ${org.name} already has ${existingInvoicesCount} invoices.`);
    }
  }

  console.log('\n[SEED] Completed seeding all organizations!');
  await mongoose.disconnect();
}

seedBillingLedgers().catch(err => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
