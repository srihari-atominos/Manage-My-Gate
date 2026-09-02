const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');

  const db = mongoose.connection.db;

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    // Find all Guard users by email
    const guardUsers = await db.collection('users').find({ email: { $regex: /guard/i } }).toArray();
    const guardIds = guardUsers.map(u => u._id);

    // Update the Guard Users password
    const updateResult = await db.collection('users').updateMany(
      { _id: { $in: guardIds } },
      { 
        $set: { 
          password: passwordHash
        } 
      }
    );

    console.log(`Update Result: Password reset for ${updateResult.modifiedCount} guard user(s) to 'Password@123'`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

run();
