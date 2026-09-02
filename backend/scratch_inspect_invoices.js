import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false, collection: 'invoices' }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

  const invoices = await Invoice.find({ status: { $ne: 'PAID' } });
  console.log(`Found ${invoices.length} unpaid invoices in DB:`);
  for (const inv of invoices) {
    const user = await User.findById(inv.targetUserId);
    console.log(`- ID: ${inv._id}`);
    console.log(`  InvoiceNumber: ${inv.invoiceNumber}`);
    console.log(`  User: ${user ? user.email : 'Unknown'} (${inv.targetUserId})`);
    console.log(`  Amount: ${inv.amount}, TotalAmount: ${inv.totalAmount}, OutstandingAmount: ${inv.outstandingAmount}, PaidAmount: ${inv.paidAmount}`);
    console.log(`  Status: ${inv.status}, BillingPeriod: ${inv.billingPeriodString}`);
    console.log(`  UnitId: ${inv.unitId}, VillaId: ${inv.villaId}`);
  }

  process.exit(0);
}

run().catch(console.error);
