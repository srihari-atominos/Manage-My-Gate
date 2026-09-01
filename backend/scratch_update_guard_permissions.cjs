const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
  const db = mongoose.connection.db;

  try {
    const role = await db.collection('roles').findOne({ name: 'Guard' });
    if (!role) {
      console.log('Error: Could not find Guard role');
      return;
    }

    const targetPermNames = [
      'amenities:scanner', 
      'amenities:security_logs', 
      'complaints:staff', 
      'complaints:raise_ticket', 
      'notices:active_board'
    ];

    const perms = await db.collection('permissions').find({ name: { $in: targetPermNames } }).toArray();
    console.log(`Found ${perms.length} matching permissions.`);

    for (const perm of perms) {
      await db.collection('rolepermissions').updateOne(
        { roleId: role._id, permissionId: perm._id }, 
        { $set: { roleId: role._id, permissionId: perm._id } }, 
        { upsert: true }
      );
    }

    await db.collection('roles').updateOne(
      { _id: role._id }, 
      { $addToSet: { permissions: { $each: targetPermNames } } }
    );

    console.log('Successfully updated guard permissions!');

  } finally {
    mongoose.disconnect();
  }
}

run();
