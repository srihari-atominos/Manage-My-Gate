import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import PlatformQuote from '../features/platformQuote/platformQuote.model.js';
import PlatformOrder from '../features/platformOrder/platformOrder.model.js';
import PlatformInvoice from '../features/platformInvoice/platformInvoice.model.js';
import PlatformSubscription from '../features/platformSubscription/platformSubscription.model.js';
import ProvisioningWorkflow from '../features/platformProvisioningJob/provisioningWorkflow.model.js';

async function verifyAllBillingData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    const quotes = await PlatformQuote.find({}).exec();
    const orders = await PlatformOrder.find({}).exec();
    const invoices = await PlatformInvoice.find({}).exec();
    const subscriptions = await PlatformSubscription.find({}).exec();
    const workflows = await ProvisioningWorkflow.find({}).exec();

    console.log('=== PLATFORM BILLING SYSTEM DATA AUDIT ===');
    console.log(`1. Total Quotes in Database: ${quotes.length}`);
    quotes.forEach(q => console.log(`   - Quote: ${q.quoteNumber || q._id}, Status: ${q.status}`));

    console.log(`2. Total Orders in Database: ${orders.length}`);
    orders.forEach(o => console.log(`   - Order: ${o.orderNumber || o._id}, Status: ${o.status}`));

    console.log(`3. Total Invoices in Database: ${invoices.length}`);
    invoices.forEach(i => console.log(`   - Invoice: ${i.invoiceNumber || i._id}, Status: ${i.status}`));

    console.log(`4. Total Subscriptions in Database: ${subscriptions.length}`);
    subscriptions.forEach(s => console.log(`   - Subscription: ${s.subscriptionNumber || s._id}, Status: ${s.status}`));

    console.log(`5. Total Provisioning Workflows in Database: ${workflows.length}`);
    workflows.forEach(w => console.log(`   - Workflow: ${w.workflowNumber || w._id}, Status: ${w.status}`));

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyAllBillingData();
