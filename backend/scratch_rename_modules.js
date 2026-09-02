import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Remove "integrations" module
    const res1 = await db.collection('workspaces').updateMany(
      {},
      { $pull: { modules: { moduleKey: 'integrations' } } }
    );
    console.log('Removed integrations:', res1);

    // Rename "administration" module to "Administration & Security" with key "administration_security"
    // Using array filters to update the specific nested object
    const res2 = await db.collection('workspaces').updateMany(
      {},
      { 
        $set: { 
          "modules.$[elem].moduleKey": "administration_security",
          "modules.$[elem].moduleName": "Administration & Security"
        } 
      },
      { arrayFilters: [{ "elem.moduleKey": "administration" }] }
    );
    console.log('Renamed administration to administration_security:', res2);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
