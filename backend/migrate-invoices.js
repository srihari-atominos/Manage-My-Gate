import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Invoice from './src/features/invoice/invoice.model.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

async function migrateInvoices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for Migration');

    const invoices = await Invoice.find({});
    console.log(`Found ${invoices.length} invoices to migrate.`);

    let migratedCount = 0;
    for (const invoice of invoices) {
      if (invoice.totalAmount !== undefined && invoice.totalAmount !== null) {
        // Already migrated
        continue;
      }

      const isPaid = invoice.status === 'PAID';
      
      // Map amounts safely from legacy fields
      const legacyTotalDue = invoice.totalDue || 0;
      const legacyHardcodedAmount = invoice.hardcodedAmount || 0;

      invoice.currentCharge = legacyHardcodedAmount;
      invoice.totalAmount = legacyTotalDue;
      invoice.paidAmount = isPaid ? legacyTotalDue : 0;
      invoice.outstandingAmount = invoice.totalAmount - invoice.paidAmount;
      
      // Default new fields
      invoice.previousOutstanding = 0;
      invoice.carryForwardEnabled = true;
      invoice.invoiceVersion = 1;
      invoice.paymentCompletionDate = invoice.paid_at || null;
      invoice.isDeleted = false;
      invoice.carryForwardHistory = [];
      
      // DO NOT delete legacy fields to allow rollback and prevent breaking old code instantly
      
      await invoice.save();
      migratedCount++;
      console.log(`Migrated invoice ${invoice._id}`);
    }

    console.log(`Migration Complete. Migrated ${migratedCount} invoices.`);
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateInvoices();
