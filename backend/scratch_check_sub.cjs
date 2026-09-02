const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
  const db = mongoose.connection.db;

  try {
    const comm = await db.collection('organizations').findOne({ name: 'Comm' });
    const sub = await db.collection('subscriptions').findOne({ orgId: comm._id });
    if(sub) { 
        const pkg = await db.collection('packages').findOne({ _id: sub.packageId }); 
        const modules = await db.collection('modules').find({ _id: { $in: pkg.modules } }).toArray(); 
        console.log("Package modules: ", modules.map(m => m.key)); 
    } else { 
        console.log('No subscription for Comm'); 
    }
  } finally {
    mongoose.disconnect();
  }
}

run();
