import mongoose from 'mongoose';

const dbs = ['database_name', 'manage_my_gate'];

async function run() {
  for (const dbName of dbs) {
    const uri = `mongodb://127.0.0.1:27017/${dbName}`;
    console.log(`Connecting to ${uri}...`);
    try {
      const conn = await mongoose.createConnection(uri).asPromise();
      const db = conn.db;

      // 1. Delete all invoices
      const invoiceCollections = ['invoices', 'platforminvoices', 'invoicesequences'];
      for (const col of invoiceCollections) {
        try {
          const count = await db.collection(col).countDocuments();
          if (count > 0) {
            const res = await db.collection(col).deleteMany({});
            console.log(`[${dbName}] Deleted ${res.deletedCount} documents from '${col}'.`);
          } else {
            console.log(`[${dbName}] Collection '${col}' is already empty.`);
          }
        } catch (err) {
          console.log(`[${dbName}] Error or collection '${col}' does not exist:`, err.message);
        }
      }

      // 2. Delete payments linked to invoices
      try {
        const paymentRes = await db.collection('payments').deleteMany({
          $or: [
            { invoiceId: { $exists: true, $ne: null } },
            { invoice: { $exists: true, $ne: null } },
          ]
        });
        console.log(`[${dbName}] Deleted ${paymentRes.deletedCount} invoice-linked payments from 'payments'.`);
      } catch (err) {
        console.log(`[${dbName}] Error deleting payments:`, err.message);
      }

      // 3. Clear paymenttransactions and paymentallocations if any
      for (const col of ['paymenttransactions', 'paymentallocations']) {
        try {
          const c = await db.collection(col).countDocuments();
          if (c > 0) {
            const r = await db.collection(col).deleteMany({});
            console.log(`[${dbName}] Deleted ${r.deletedCount} records from '${col}'.`);
          }
        } catch (e) {}
      }

      await conn.close();
      console.log(`[${dbName}] Finished clearing invoices.`);
    } catch (err) {
      console.error(`Error connecting to ${dbName}:`, err.message);
    }
  }
}

run().catch(console.error);

