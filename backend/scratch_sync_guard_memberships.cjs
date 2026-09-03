const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
  const db = mongoose.connection.db;

  try {
    const commOrg = await db.collection('organizations').findOne({ name: { $regex: /^comm$/i } });
    if (!commOrg) {
      console.log('Error: Could not find comm org');
      return;
    }
    const commId = commOrg._id;

    // Get guard users
    const guardUsers = await db.collection('users').find({ email: { $regex: /guard/i } }).toArray();
    const guardIds = guardUsers.map(u => u._id);

    // Update their orgMemberships to point to commId
    const updateResult = await db.collection('orgmemberships').updateMany(
      { userId: { $in: guardIds } },
      { 
        $set: { 
          orgId: commId
        } 
      }
    );

    console.log(`Successfully moved ${updateResult.modifiedCount} orgmemberships to the Comm org for guards!`);

  } finally {
    mongoose.disconnect();
  }
}

run();
