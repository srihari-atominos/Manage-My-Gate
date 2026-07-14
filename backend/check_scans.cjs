const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate').then(async () => {
  const db = mongoose.connection.db;
  const scans = await db.collection('amenitybookings').find({
    status: { $in: ['checked-in', 'completed'] }
  }).toArray();
  
  console.log('Scans found:', scans.length);
  if (scans.length > 0) {
    console.log(scans[0]);
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
