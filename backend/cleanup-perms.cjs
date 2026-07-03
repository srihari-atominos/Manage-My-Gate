const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection.db;

  const featuresToRemove = ['amenity', 'amenity_slot', 'amenityBooking', 'samples'];

  // 1. Find the permissions to delete
  const permsToDelete = await db.collection('permissions').find({ feature: { $in: featuresToRemove } }).toArray();
  const permIds = permsToDelete.map(p => p._id);
  const permIdStrings = permIds.map(id => id.toString());

  console.log(`Found ${permIds.length} junk permissions to remove.`);

  if (permIds.length > 0) {
    // 2. Remove them from all rolepermissions
    const resultRP = await db.collection('rolepermissions').updateMany(
      {},
      { $pull: { permissionId: { $in: permIds } } }
    );
    // rolepermissions stores an array of strings in some architectures, or ObjectIds. Let's do both just in case.
    await db.collection('rolepermissions').updateMany(
      {},
      { $pull: { permissionId: { $in: permIdStrings } } }
    );
    console.log(`Updated role permissions.`);

    // 3. Delete from permissions collection
    const resultP = await db.collection('permissions').deleteMany({ _id: { $in: permIds } });
    console.log(`Deleted ${resultP.deletedCount} permissions from DB.`);
  }

  process.exit(0);
}

cleanup().catch(console.error);
