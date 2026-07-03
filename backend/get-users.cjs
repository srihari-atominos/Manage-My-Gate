const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  const hash = await bcrypt.hash('password123', 10);
  
  await mongoose.connection.db.collection('users').updateMany({}, {$set: {password: hash}});
  
  console.log(JSON.stringify(users.map(u => ({ email: u.email, username: u.username }))));
  process.exit(0);
}

main().catch(console.error);
