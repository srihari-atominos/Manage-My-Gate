const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/database_name');
  
  const user = await mongoose.connection.collection('users').findOne({ email: 'complex.owner@gmail.com' });
  console.log('Query with strict exact match:', user ? 'Found' : 'Not Found');
  
  if (user) {
    console.log('User status:', user.status);
  }

  process.exit(0);
}

main().catch(console.error);
