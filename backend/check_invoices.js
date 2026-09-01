import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/database_name';

async function checkData() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const db = mongoose.connection.db;

  const invoices = await db.collection('invoices').find({}).toArray();
  console.log('Total Invoices in DB:', invoices.length);
  if (invoices.length > 0) {
    console.log('First Invoice:', JSON.stringify(invoices[0], null, 2));
  }

  const villas = await db.collection('villas').find({}).toArray();
  console.log('Total Villas in DB:', villas.length);
  if (villas.length > 0) {
    console.log('First Villa:', JSON.stringify(villas[0], null, 2));
  }

  const assessments = await db.collection('assessments').find({}).toArray();
  console.log('Total Assessments in DB:', assessments.length);
  if (assessments.length > 0) {
    console.log('First Assessment:', JSON.stringify(assessments[0], null, 2));
  }

  await mongoose.disconnect();
}

checkData().catch(console.error);
