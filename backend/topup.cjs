const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection.db;
  await db.collection('wallets').updateOne(
    { userId: new mongoose.Types.ObjectId('6a47a721444a6291458e2371') }, 
    { $set: { balance: 5000 } }
  );
  console.log('Wallet topped up successfully.');
  await mongoose.disconnect();
}

run().catch(console.error);
