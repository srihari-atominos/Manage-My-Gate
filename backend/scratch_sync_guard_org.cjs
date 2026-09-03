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

    // Update all guards
    const guardUsers = await db.collection('users').find({ email: { $regex: /guard/i } }).toArray();
    const guardIds = guardUsers.map(u => u._id);

    const updateResult = await db.collection('users').updateMany(
      { _id: { $in: guardIds } },
      { 
        $set: { 
          organizations: [commId],
          availableWorkspaces: [{
            orgId: commId,
            orgName: "Comm",
            role: "GUARD",
            status: "Active"
          }],
          organizationId: commId,
          orgId: commId
        } 
      }
    );

    console.log(`Successfully updated organizations array and workspaces for ${updateResult.modifiedCount} guard users!`);

  } finally {
    mongoose.disconnect();
  }
}

run();
