const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;
  await db.collection('organizations').updateOne(
    { name: 'System Platform' },
    { $addToSet: { allowedFeatures: 'villas' } }
  );
  console.log('Added villas to System Platform allowedFeatures');
  process.exit(0);
}
run();
