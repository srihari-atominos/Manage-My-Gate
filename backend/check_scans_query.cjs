const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate').then(async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  console.log('startOfDay:', startOfDay);
  
  const orgId = new mongoose.Types.ObjectId('6a45f88346febe8de89233d8');

  const scans = await mongoose.connection.db.collection('amenitybookings').find({
    orgId: orgId,
    status: { $in: ['checked-in', 'completed'] },
    $or: [
      { checkInTime: { $gte: startOfDay } },
      { checkOutTime: { $gte: startOfDay } }
    ]
  }).toArray();
  
  console.log('Scans found via startOfDay query:', scans.length);
  if (scans.length > 0) {
    console.log(scans[0]);
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
