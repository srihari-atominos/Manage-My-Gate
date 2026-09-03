import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

import User from './src/features/user/user.model.js';
import Villa from './src/features/villa/villa.model.js';
import Invoice from './src/features/invoice/invoice.model.js';

const MONGODB_URI = process.env.MONGODB_URI;
const ORG_ID = '6a9513437911e056d83636ea';
const DOMAIN = 'globalcom927.com';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find the family member and their villa
  const familyUser = await User.findOne({ email: `family1@${DOMAIN}` });
  const villa = await Villa.findOne({ orgId: new mongoose.Types.ObjectId(ORG_ID), unitNumber: '101' });

  if (!familyUser || !villa) {
    console.error('Family user or Villa not found!');
    process.exit(1);
  }

  // Create a test invoice for the villa and user if none exists
  let invoice = await Invoice.findOne({ targetUserId: familyUser._id });
  if (!invoice) {
    invoice = await Invoice.create({
      orgId: new mongoose.Types.ObjectId(ORG_ID),
      communityId: new mongoose.Types.ObjectId(ORG_ID),
      assessmentId: new mongoose.Types.ObjectId(),
      villaId: villa._id,
      unitId: villa._id,
      targetUserId: familyUser._id,
      amount: 1500,
      currentCharge: 1500,
      totalAmount: 1500,
      outstandingAmount: 1500,
      status: 'UNPAID',
      billingPeriodString: '2026-08',
      invoiceNumber: 'INV-' + Date.now(),
      dueDate: new Date(Date.now() + 86400000 * 7),
      particulars: [{ description: 'Monthly Maintenance Fee', amount: 1500 }]
    });
    console.log('Created test invoice:', invoice._id, invoice.invoiceNumber);
  } else {
    console.log('Found existing invoice:', invoice._id, invoice.invoiceNumber);
  }

  // Now, let's login as the family member via API
  console.log('\nLogging in via API...');
  const loginRes = await axios.post('http://192.168.0.108:5002/api/auth/login', {
    login: familyUser.email,
    password: 'Password@123'
  });
  
  let token = loginRes.data?.data?.token || loginRes.data?.token;
  if (!token) {
    console.error('Failed to login via API!');
    process.exit(1);
  }
  console.log('Login successful!');

  // Switch context to targetOrgId
  console.log('\nSwitching context to org:', ORG_ID);
  const switchRes = await axios.post('http://192.168.0.108:5002/api/auth/switch-context', {
    targetOrgId: ORG_ID
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  token = switchRes.data?.data?.token || switchRes.data?.token;
  if (!token) {
    console.error('Failed to switch context!');
    process.exit(1);
  }
  console.log('Context switched successfully! New scoped token acquired.');

  const client = axios.create({
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Request-ID': 'uat-test-request-id-12345'
    }
  });

  // Test getMyDues endpoint
  console.log('\nFetching outstanding dues via GET /api/invoices/my-dues...');
  const duesRes = await client.get('http://192.168.0.108:5002/api/invoices/my-dues');
  console.log(`Dues fetched! Found ${duesRes.data?.data?.length || 0} outstanding invoices.`);

  // Test settleOffline endpoint
  console.log(`\nSettle invoice ${invoice.invoiceNumber} offline via PATCH /api/invoices/${invoice._id}/settle-offline...`);
  const settleRes = await client.patch(`http://192.168.0.108:5002/api/invoices/${invoice._id}/settle-offline`, {
    offlineReference: 'REF-OFFLINE-' + Date.now(),
    paymentMethod: 'NEFT'
  }, {
    headers: {
      'x-organization-id': ORG_ID
    }
  });

  console.log('Settlement Response:', settleRes.data);
  console.log('\nAll payment endpoints successfully validated for the Family Member role!');
  process.exit(0);
}

run().catch(console.error);
