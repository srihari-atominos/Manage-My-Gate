const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');

  const db = mongoose.connection.db;

  try {
    // Find the community called "comm" (case-insensitive regex)
    const commOrg = await db.collection('organizations').findOne({ name: { $regex: /^comm$/i } });
    if (!commOrg) {
      console.log('Error: Could not find an organization named "comm".');
      
      const allOrgs = await db.collection('organizations').find({}, { projection: { name: 1 } }).toArray();
      console.log('Available organizations:', allOrgs);
      return;
    }
    console.log(`Found Organization "comm": ${commOrg._id}`);

    // Find all Guard users by email
    const guardUsers = await db.collection('users').find({ email: { $regex: /guard/i } }).toArray();
    
    if (guardUsers.length === 0) {
      console.log('Error: Could not find any users with "guard" in their email.');
      return;
    }
    
    const guardIds = guardUsers.map(u => u._id);
    console.log(`Found ${guardUsers.length} Guard Users:`, guardUsers.map(u => u.email).join(', '));

    // Update the Guard Users to belong to "comm"
    const updateResult = await db.collection('users').updateMany(
      { _id: { $in: guardIds } },
      { 
        $set: { 
          organizationId: commOrg._id,
          orgId: commOrg._id 
        } 
      }
    );

    console.log(`Update Result: Modified ${updateResult.modifiedCount} user(s).`);
    console.log(`Success! Guard '${guardUser.name}' is now assigned to the community 'comm'.`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

run();
