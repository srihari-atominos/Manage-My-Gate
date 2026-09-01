import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false, collection: 'invoices' }));

  // Find all invoices where outstandingAmount is undefined or null
  const invoices = await Invoice.find({
    $or: [
      { outstandingAmount: { $exists: false } },
      { outstandingAmount: null },
      { totalAmount: { $exists: false } },
      { totalAmount: null }
    ]
  });

  console.log(`Found ${invoices.length} legacy invoices to heal.`);

  for (const inv of invoices) {
    const total = inv.totalDue || inv.hardcodedAmount || inv.amount || 0;
    const paid = inv.paidAmount || 0;
    const outstanding = Math.max(0, total - paid);

    await Invoice.updateOne({ _id: inv._id }, {
      $set: {
        totalAmount: total,
        outstandingAmount: outstanding,
        paidAmount: paid,
        currentCharge: inv.currentCharge || total
      }
    });

    console.log(`Healed Invoice ${inv.invoiceNumber} (_id: ${inv._id}): set totalAmount = ${total}, outstandingAmount = ${outstanding}`);
  }

  process.exit(0);
}

run().catch(console.error);
