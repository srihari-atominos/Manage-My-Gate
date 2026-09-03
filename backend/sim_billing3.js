import mongoose from 'mongoose';
import { Assessment } from './src/features/assessment/assessment.model.js';
import InvoiceService from './src/features/invoice/invoice.services.js';

const uri = 'mongodb://127.0.0.1:27017/database_name';

async function runSim() {
  await mongoose.connect(uri);
  const orgId = '6a6efd60f62f21f2b26eb9a0';
  const assessmentId = '6a8c1845490d87354cc8d393'; 
  
  try {
    const assessment = await Assessment.findById(assessmentId);
    console.log('Running for assessment:', assessment.name);
    
    const result = await InvoiceService.generateBatchInvoices(assessment);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error generating:', err);
  }

  await mongoose.disconnect();
}

runSim().catch(console.error);
