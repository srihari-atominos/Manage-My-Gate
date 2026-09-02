import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/atominos';

async function checkData() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const Villa = mongoose.model('Villa', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
  const Assessment = mongoose.model('Assessment', new mongoose.Schema({}, { strict: false }));
  
  const villasCount = await Villa.countDocuments();
  console.log('Total Villas:', villasCount);
  
  const assessmentsCount = await Assessment.countDocuments();
  console.log('Total Assessments:', assessmentsCount);
  const assessments = await Assessment.find().lean();
  console.log('Assessments:', JSON.stringify(assessments, null, 2));

  const invoicesCount = await Invoice.countDocuments();
  console.log('Total Invoices:', invoicesCount);
  const invoices = await Invoice.find().lean();
  console.log('Invoices:', JSON.stringify(invoices, null, 2));

  await mongoose.disconnect();
}

checkData().catch(console.error);
