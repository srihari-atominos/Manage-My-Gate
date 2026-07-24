const mongoose = require('mongoose');

async function checkOrg() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
    
    const db = mongoose.connection.db;
    const org = await db.collection('organizations').findOne({ _id: new mongoose.Types.ObjectId('6a47a732444a6291458e2372') });
    console.log('Org:', org);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrg();
