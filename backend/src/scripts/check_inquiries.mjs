import mongoose from 'mongoose';

async function checkInquiries() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage-my-gate');
  const db = mongoose.connection.db;
  const inquiries = await db.collection('crminquiries').find({}).toArray();
  console.log('--- FOUND INQUIRIES ---');
  console.log(inquiries.map(i => ({ id: i._id.toString(), org: i.organizationName, name: i.contactName, email: i.email })));

  const threads = await db.collection('crmthreads').find({}).toArray();
  console.log('--- FOUND THREADS ---');
  console.log(threads);

  await mongoose.disconnect();
}

checkInquiries();
