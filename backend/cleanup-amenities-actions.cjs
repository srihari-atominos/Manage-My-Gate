const mongoose = require('mongoose');

async function cleanupActions() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection.db;

  const actionsToRemove = [
    'create',
    'read',
    'update',
    'delete',
    'book',
    'cancel_booking',
    'manage_bookings',
    'view_security_logs'
  ];

  // 1. Find the permissions to delete
  const permsToDelete = await db.collection('permissions').find({ 
    feature: 'amenities',
    action: { $in: actionsToRemove }
  }).toArray();
  
  const permIds = permsToDelete.map(p => p._id);

  console.log(`Found ${permIds.length} permissions to remove from 'amenities' feature.`);

  if (permIds.length > 0) {
    // 2. Delete junction documents
    const resultRP = await db.collection('rolepermissions').deleteMany({
      permissionId: { $in: permIds }
    });
    console.log(`Deleted ${resultRP.deletedCount} role permissions mapping documents.`);

    // 3. Delete from permissions collection
    const resultP = await db.collection('permissions').deleteMany({ _id: { $in: permIds } });
    console.log(`Deleted ${resultP.deletedCount} permissions from DB.`);
  }

  process.exit(0);
}

cleanupActions().catch(console.error);
