const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate').then(async () => {
  const hash = await bcrypt.hash('password123', 10);
  await mongoose.connection.db.collection('users').updateOne({email: 'superadmin@example.com'}, {$set: {password: hash}});
  console.log('Password updated');
  process.exit(0);
});
