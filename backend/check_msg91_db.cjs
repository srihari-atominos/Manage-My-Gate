const mongoose = require('mongoose');

async function checkMsg91() {
  try {
    await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
    const db = mongoose.connection.db;
    
    const msg91Config = await db.collection('integrationhubs').findOne({ provider: 'msg91' });
    console.log("--- MSG91 Configuration in Database ---");
    if (msg91Config) {
        console.log("Found MSG91 configuration!");
        console.log(JSON.stringify(msg91Config, null, 2));
    } else {
        console.log("No MSG91 configuration found in the database. Relying on .env variables.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkMsg91();
