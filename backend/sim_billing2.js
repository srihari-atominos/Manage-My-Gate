import mongoose from 'mongoose';
import { Villa } from './src/features/villa/villa.model.js';
import { Assessment } from './src/features/assessment/assessment.model.js';
import InvoiceService from './src/features/invoice/invoice.services.js';

const uri = 'mongodb://127.0.0.1:27017/database_name';

async function runSim() {
  await mongoose.connect(uri);
  const orgId = '6a6efd60f62f21f2b26eb9a0';
  const assessmentId = '6a8c1845490d87354cc8d393'; 
  
  try {
    const units = await Villa.find({ orgId: new mongoose.Types.ObjectId(orgId) }).populate('residents.userId');
    console.log('UNITS IN ORG:', units.map(u => ({ id: u._id, unitNumber: u.unitNumber, residents: u.residents })));
    
    const result = await InvoiceService.generateBatchInvoices(orgId, assessmentId);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error generating:', err);
  }

  await mongoose.disconnect();
}

runSim().catch(console.error);
