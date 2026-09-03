import mongoose from 'mongoose';
import InvoiceService from './src/features/invoice/invoice.services.js';

const uri = 'mongodb://127.0.0.1:27017/database_name';

async function runSim() {
  await mongoose.connect(uri);
  const orgId = '6a6efd60f62f21f2b26eb9a0';
  const assessmentId = '6a8c1845490d87354cc8d393'; 
  
  try {
    const result = await InvoiceService.generateBatchInvoices(orgId, assessmentId);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error generating:', err);
  }

  await mongoose.disconnect();
}

runSim().catch(console.error);
