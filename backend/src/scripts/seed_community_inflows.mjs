import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

// Import Models
import Payment from '../features/payment/payment.model.js';
import Invoice from '../features/invoice/invoice.model.js';
import Assessment from '../features/assessment/assessment.model.js';
import Organization from '../features/organization/organization.model.js';
import User from '../features/user/user.model.js';
import Villa from '../features/villa/villa.model.js';

const round = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

export async function seedCommunityInflows() {
  console.log(`[SEED INFLOWS] Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[SEED INFLOWS] Connected successfully.');

  const adminUser =
    (await User.findOne({ email: /naveen/i })) ||
    (await User.findOne({}));

  if (!adminUser) {
    console.error('No admin user found!');
    process.exit(1);
  }

  const targetOrgs = await Organization.find({
    name: {
      $in: [
        'Nexus Community',
        'Nested Community',
        'Nested Community 2',
        'Hallan Illam',
        'Hallan Illam 2',
      ],
    },
  });

  console.log(`[SEED INFLOWS] Found ${targetOrgs.length} target community organizations.`);

  for (const org of targetOrgs) {
    const orgId = org._id;
    console.log(`\n========================================`);
    console.log(`[SEED INFLOWS] Seeding Inflows for: ${org.name} (${orgId})`);

    // Clean existing seed inflows and invoices to avoid duplicate keys
    await Payment.deleteMany({
      orgId,
      gatewayTransactionId: { $regex: /^TXN-INFLOW-/ },
    });
    await Invoice.deleteMany({
      $or: [{ communityId: orgId }, { orgId }],
      invoiceNumber: { $regex: /^INV-/ },
    });

    // Find or retrieve existing villas
    const villas = await Villa.find({ orgId });
    const villa101 = villas.find((v) => v.unitNumber === '101') || villas[0] || null;
    const villa102 = villas.find((v) => v.unitNumber === '102') || villas[1] || null;

    // Find or create Assessment
    let assessment = await Assessment.findOne({ communityId: orgId });
    if (!assessment) {
      assessment = await Assessment.create({
        communityId: orgId,
        name: 'Community Maintenance Assessment',
        type: 'RECURRING',
        billingCycle: 'QUARTERLY',
        generationDay: 1,
        calculationMethod: {
          type: 'FLAT_RATE',
          flatAmount: 20000,
        },
        targetScope: {
          type: 'ALL_COMMUNITY',
        },
        isActive: true,
      });
    }

    const maintenanceInflows = [
      {
        unit: 'Villa 101',
        title: 'Quarterly Maintenance Dues (Q3)',
        amount: 28500,
        daysAgo: 2,
        method: 'UPI',
        gateway: 'razorpay',
        payerName: 'Naveen Vijayakumar',
      },
      {
        unit: 'Villa 102',
        title: 'Monthly Maintenance & Water Charges',
        amount: 18000,
        daysAgo: 6,
        method: 'NETBANKING',
        gateway: 'razorpay',
        payerName: 'Karthik Ramanathan',
      },
      {
        unit: 'Unit 201',
        title: 'Annual Reserve Fund & Maintenance Fee',
        amount: 45000,
        daysAgo: 9,
        method: 'BANK_TRANSFER',
        gateway: 'offline',
        payerName: 'Dr. Subramanian',
      },
      {
        unit: 'Unit 202',
        title: 'Quarterly Society Maintenance',
        amount: 24000,
        daysAgo: 12,
        method: 'UPI',
        gateway: 'razorpay',
        payerName: 'Priya Sundaram',
      },
      {
        unit: 'Unit 301',
        title: 'Monthly Association Assessment',
        amount: 19500,
        daysAgo: 15,
        method: 'CARD',
        gateway: 'razorpay',
        payerName: 'Sanjay Mehta',
      },
      {
        unit: 'Unit 302',
        title: 'Quarterly Maintenance & Elevator Fee',
        amount: 22000,
        daysAgo: 19,
        method: 'UPI',
        gateway: 'razorpay',
        payerName: 'Ananya Sharma',
      },
      {
        unit: 'Penthouse 401',
        title: 'Premium Penthouse Semi-Annual Dues',
        amount: 65000,
        daysAgo: 24,
        method: 'BANK_TRANSFER',
        gateway: 'offline',
        payerName: 'Rajesh Gopinath',
      },
      {
        unit: 'Villa A-12',
        title: 'Monthly Maintenance & Security Contribution',
        amount: 26000,
        daysAgo: 27,
        method: 'UPI',
        gateway: 'razorpay',
        payerName: 'Vikramaditya Bose',
      },
      {
        unit: 'Villa B-05',
        title: 'Quarterly Common Facilities Assessment',
        amount: 23500,
        daysAgo: 32,
        method: 'NETBANKING',
        gateway: 'razorpay',
        payerName: 'Deepak Chawla',
      },
      {
        unit: 'Unit 502',
        title: 'Annual Sinking Fund & Lift Replacement Dues',
        amount: 55000,
        daysAgo: 38,
        method: 'BANK_TRANSFER',
        gateway: 'offline',
        payerName: 'Muruganandam K.',
      },
      // Earlier 2026 & 2025 Historical Inflows for Multi-Month and Yearly Cash Flow Trends
      { unit: 'Villa 101', title: 'Q3 Maintenance Dues', amount: 28500, daysAgo: 55, method: 'UPI', gateway: 'razorpay', payerName: 'Naveen Vijayakumar' },
      { unit: 'Unit 201', title: 'Monthly Association Charges', amount: 32000, daysAgo: 75, method: 'NETBANKING', gateway: 'razorpay', payerName: 'Dr. Subramanian' },
      { unit: 'Villa 102', title: 'Q2 Facilities Assessment', amount: 27000, daysAgo: 105, method: 'UPI', gateway: 'razorpay', payerName: 'Karthik Ramanathan' },
      { unit: 'Penthouse 401', title: 'Quarterly Maintenance', amount: 62000, daysAgo: 135, method: 'BANK_TRANSFER', gateway: 'offline', payerName: 'Rajesh Gopinath' },
      { unit: 'Unit 301', title: 'Monthly Maintenance Fee', amount: 19500, daysAgo: 165, method: 'UPI', gateway: 'razorpay', payerName: 'Sanjay Mehta' },
      { unit: 'Villa A-12', title: 'Quarterly Maintenance Dues', amount: 26000, daysAgo: 195, method: 'NETBANKING', gateway: 'razorpay', payerName: 'Vikramaditya Bose' },
      { unit: 'Unit 202', title: 'Q1 Society Assessment', amount: 24000, daysAgo: 225, method: 'UPI', gateway: 'razorpay', payerName: 'Priya Sundaram' },
      { unit: 'Unit 102', title: 'Annual Infrastructure Levy', amount: 48000, daysAgo: 255, method: 'BANK_TRANSFER', gateway: 'offline', payerName: 'Karthik Ramanathan' },
      { unit: 'Villa 101', title: 'January Maintenance', amount: 28000, daysAgo: 285, method: 'UPI', gateway: 'razorpay', payerName: 'Naveen Vijayakumar' },
      { unit: 'Penthouse 401', title: 'Year-End Sinking Contribution', amount: 60000, daysAgo: 315, method: 'BANK_TRANSFER', gateway: 'offline', payerName: 'Rajesh Gopinath' },
      { unit: 'Villa B-05', title: 'Q4 Society Maintenance (2025)', amount: 23500, daysAgo: 345, method: 'NETBANKING', gateway: 'razorpay', payerName: 'Deepak Chawla' },
      { unit: 'Unit 502', title: 'Diwali Facility Assessment (2025)', amount: 52000, daysAgo: 380, method: 'BANK_TRANSFER', gateway: 'offline', payerName: 'Muruganandam K.' },
      { unit: 'Villa 101', title: 'Autumn Maintenance Dues (2025)', amount: 27500, daysAgo: 410, method: 'UPI', gateway: 'razorpay', payerName: 'Naveen Vijayakumar' },
    ];

    const amenityInflows = [
      {
        title: 'Clubhouse Banquet Hall Weekend Wedding Reception',
        amount: 25000,
        daysAgo: 4,
        method: 'NETBANKING',
        gateway: 'razorpay',
        refType: 'AmenityBooking',
        payerName: 'Kavitha & Arul Wedding Party',
      },
      {
        title: 'Central Floodlit Tennis Court Night Pass (Monthly)',
        amount: 8500,
        daysAgo: 8,
        method: 'UPI',
        gateway: 'razorpay',
        refType: 'AmenityReservation',
        payerName: 'Nexus Tennis Club',
      },
      {
        title: 'Swimming Pool Weekend Children Coaching Batch (Q3)',
        amount: 12000,
        daysAgo: 14,
        method: 'UPI',
        gateway: 'razorpay',
        refType: 'AmenityBooking',
        payerName: 'Dolphin Swim Academy',
      },
      {
        title: 'Rooftop Barbecue Pavilion Family Evening Party',
        amount: 6500,
        daysAgo: 18,
        method: 'CARD',
        gateway: 'razorpay',
        refType: 'AmenityReservation',
        payerName: 'Ashwin Narayanan',
      },
      {
        title: 'Community Guest Suite Deluxe (4-Night Stay)',
        amount: 14000,
        daysAgo: 22,
        method: 'NETBANKING',
        gateway: 'razorpay',
        refType: 'AmenityBooking',
        payerName: 'Guest: Col. R. K. Varma',
      },
      {
        title: 'Badminton Court Tournament Slot Booking',
        amount: 7500,
        daysAgo: 29,
        method: 'UPI',
        gateway: 'razorpay',
        refType: 'AmenityReservation',
        payerName: 'Community Badminton League',
      },
    ];

    let totalSeeded = 0;
    let totalInflowAmount = 0;
    const users = await User.find({}).limit(15);

    // 1. Seed Maintenance Inflows
    for (let i = 0; i < maintenanceInflows.length; i++) {
      const item = maintenanceInflows[i];
      const targetUser = users[i % users.length] || adminUser;
      const pDate = new Date(Date.now() - item.daysAgo * 86_400_000);
      const billingPeriod = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
      const invNum = `INV-2026-${String(i + 1).padStart(3, '0')}${org._id.toString().slice(-4).toUpperCase()}`;
      const recNum = `REC-2026-INV-${String(i + 1).padStart(3, '0')}${org._id.toString().slice(-4).toUpperCase()}`;
      const txnRef = `TXN-INFLOW-INV-${org._id.toString().slice(-4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;

      // Create canonical Invoice for this payment
      const invoice = await Invoice.create({
        orgId,
        communityId: orgId,
        assessmentId: assessment._id,
        targetUserId: new mongoose.Types.ObjectId(),
        invoiceNumber: invNum,
        userId: targetUser._id,
        unitId: (i % 2 === 0 ? villa101?._id : villa102?._id) || new mongoose.Types.ObjectId(),
        totalAmount: item.amount,
        currentCharge: item.amount,
        paidAmount: item.amount,
        outstandingAmount: 0,
        status: 'PAID',
        dueDate: new Date(pDate.getTime() + 15 * 86_400_000),
        billingPeriodString: billingPeriod,
        paymentMethod: item.method,
        createdAt: pDate,
        updatedAt: pDate,
      });

      // Create matching Payment record
      await Payment.create({
        orgId,
        userId: targetUser._id,
        domain: 'INVOICE',
        referenceType: 'Invoice',
        referenceId: invoice._id,
        invoiceId: invoice._id,
        villaId: invoice.unitId,
        type: 'Payment',
        status: 'success',
        amount: item.amount,
        currency: 'INR',
        paymentCategory: item.gateway === 'offline' ? 'OFFLINE' : 'ONLINE',
        paymentMethod: item.method,
        gateway: item.gateway,
        gatewayTransactionId: txnRef,
        receiptNumber: recNum,
        paymentDate: pDate,
        payerNotes: `${item.title} - ${item.unit} (${item.payerName})`,
        idempotencyKey: `seed_inflow_inv_${i + 1}_${org._id}_${Date.now()}`,
        createdAt: pDate,
        updatedAt: pDate,
      });

      totalSeeded++;
      totalInflowAmount += item.amount;
      console.log(`  + Seeded Maintenance Inflow: ${item.unit} - ${item.title} (₹${item.amount})`);
    }

    // 2. Seed Amenity Inflows
    for (let j = 0; j < amenityInflows.length; j++) {
      const amn = amenityInflows[j];
      const aDate = new Date(Date.now() - amn.daysAgo * 86_400_000);
      const recNum = `REC-2026-AMN-${String(j + 1).padStart(3, '0')}${org._id.toString().slice(-4).toUpperCase()}`;
      const txnRef = `TXN-INFLOW-AMN-${org._id.toString().slice(-4).toUpperCase()}-${String(j + 1).padStart(3, '0')}`;

      await Payment.create({
        orgId,
        userId: adminUser._id,
        domain: 'AMENITY',
        referenceType: amn.refType,
        referenceId: new mongoose.Types.ObjectId(),
        type: 'Payment',
        status: 'success',
        amount: amn.amount,
        currency: 'INR',
        paymentCategory: 'ONLINE',
        paymentMethod: amn.method,
        gateway: amn.gateway,
        gatewayTransactionId: txnRef,
        receiptNumber: recNum,
        paymentDate: aDate,
        payerNotes: `${amn.title} (${amn.payerName})`,
        idempotencyKey: `seed_inflow_amn_${j + 1}_${org._id}_${Date.now()}`,
        createdAt: aDate,
        updatedAt: aDate,
      });

      totalSeeded++;
      totalInflowAmount += amn.amount;
      console.log(`  + Seeded Amenity Inflow: ${amn.title} (₹${amn.amount})`);
    }

    // 3. Seed 1 controlled refund (for genuine financial ledger reconciliation display)
    const refundDate = new Date(Date.now() - 3 * 86_400_000);
    const refundTxn = `TXN-INFLOW-REF-${org._id.toString().slice(-4).toUpperCase()}-001`;
    await Payment.create({
      orgId,
      userId: adminUser._id,
      domain: 'INVOICE',
      referenceType: 'Invoice',
      referenceId: new mongoose.Types.ObjectId(),
      type: 'Refund',
      status: 'success',
      amount: 4500,
      currency: 'INR',
      paymentCategory: 'ONLINE',
      paymentMethod: 'UPI',
      gateway: 'razorpay',
      gatewayTransactionId: refundTxn,
      receiptNumber: `REC-2026-REF-${org._id.toString().slice(-4).toUpperCase()}-001`,
      paymentDate: refundDate,
      payerNotes: 'Refund: Duplicate UPI payment adjustment returned to resident bank account',
      idempotencyKey: `seed_inflow_ref_001_${org._id}_${Date.now()}`,
      createdAt: refundDate,
      updatedAt: refundDate,
    });
    totalSeeded++;
    totalInflowAmount -= 4500;
    console.log(`  - Seeded Inflow Refund: Duplicate UPI Adjustment (-₹4,500)`);

    console.log(`  ✓ Successfully seeded ${totalSeeded} inflows totaling net ₹${totalInflowAmount} for ${org.name}.`);
  }

  await mongoose.disconnect();
  console.log('\n[SEED INFLOWS] Completed all organizations successfully!');
}

seedCommunityInflows().catch((err) => {
  console.error('[SEED INFLOWS] Fatal error:', err);
  process.exit(1);
});
