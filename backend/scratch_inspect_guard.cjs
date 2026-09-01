const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
  const db = mongoose.connection.db;

  try {
    const guard = await db.collection('users').findOne({ email: 'guard123@enterprise.com' });
    console.log('Guard:', JSON.stringify(guard, null, 2));

    const comm = await db.collection('organizations').findOne({ name: { $regex: /^comm$/i } });
    console.log('Comm Org:', JSON.stringify(comm, null, 2));
    
  } finally {
    mongoose.disconnect();
  }
}

run();
