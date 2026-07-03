const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  const result = await mongoose.connection.db.collection('users').deleteMany({
    email: { $ne: 'superadmin@example.com' }
  });
  
  console.log(`Successfully deleted ${result.deletedCount} user(s). Only superadmin remains.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
