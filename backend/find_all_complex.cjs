const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/database_name');
  
  const users = await mongoose.connection.collection('users').find({
    $or: [
      { name: { $regex: 'complex', $options: 'i' } },
      { username: { $regex: 'complex', $options: 'i' } }
    ]
  }).toArray();

  if (users.length > 0) {
    console.log(`Found ${users.length} matching users:`);
    for (const user of users) {
      console.log(`- ID: ${user._id}`);
      console.log(`  Name: ${user.name || user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Phone: ${user.phone}`);
      console.log('---');
    }
  } else {
    console.log('No users found matching "complex".');
  }

  process.exit(0);
}

main().catch(console.error);
