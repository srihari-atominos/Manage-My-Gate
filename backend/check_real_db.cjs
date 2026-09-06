const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate_dev');
  
  const users = await mongoose.connection.collection('users').find({
    $or: [
      { name: { $regex: 'complex', $options: 'i' } },
      { username: { $regex: 'complex', $options: 'i' } }
    ]
  }).toArray();

  if (users.length > 0) {
    console.log(`Found ${users.length} matching users in manage_my_gate_dev:`);
    for (const user of users) {
      console.log(`- ID: ${user._id}`);
      console.log(`  Name: ${user.name || user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Phone: ${user.phone}`);
      console.log(`  Status: ${user.status}`);
      console.log('---');
    }
  } else {
    console.log('No users found matching "complex" in manage_my_gate_dev.');
  }

  process.exit(0);
}

main().catch(console.error);
