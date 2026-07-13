import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/manage_my_gate_dev';

const schema = new mongoose.Schema({}, { strict: false });
const VisitorPass = mongoose.model('visitorpasses', schema);
const VisitorLog = mongoose.model('visitorlogs', schema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB!');
  
  const passes = await VisitorPass.find({ 'visitorDetails.name': /double/i });
  console.log('\n--- Visitor Passes matching "double" ---');
  console.log(JSON.stringify(passes, null, 2));

  for (const pass of passes) {
    const logs = await VisitorLog.find({ passId: pass._id });
    console.log(`\n--- Visitor Logs for pass: ${pass._id} (${pass.visitorDetails?.name}) ---`);
    console.log(JSON.stringify(logs, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
