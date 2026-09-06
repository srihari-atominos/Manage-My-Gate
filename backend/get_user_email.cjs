const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/database_name');
  
  const user = await mongoose.connection.collection('users').findOne({ 
    _id: new mongoose.Types.ObjectId('6a98e90ff50601beb9fd4e1d') 
  });

  if (user) {
    console.log(`Name: ${user.name || user.username}`);
    console.log(`Email: ${user.email}`);
  } else {
    console.log('User not found.');
  }

  process.exit(0);
}

main().catch(console.error);
