const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection;
  const users = await db.collection('users').find({ phone: { $regex: '9786608686' } }).toArray();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

run().catch(console.error);
