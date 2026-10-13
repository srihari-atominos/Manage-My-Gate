const mongoose = require('mongoose');

async function cleanData() {
  try {
    await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
    const db = mongoose.connection.db;

    console.log("Connected to DB.");

    // 1. Delete ALL "Nested Community"
    const orgs = await db.collection('organizations').find({
        name: { $regex: /Nested Community/i }
    }).toArray();
    
    for (const org of orgs) {
      console.log(`\nDeleting Organization: ${org.name} (${org._id})`);
      await db.collection('orgmemberships').deleteMany({ orgId: org._id });
      await db.collection('roles').deleteMany({ orgId: org._id });
      await db.collection('villas').deleteMany({ orgId: org._id });
      await db.collection('organizations').deleteOne({ _id: org._id });
      console.log(`- Completely deleted ${org.name}`);
    }

    // 2. Delete User by Email or Phone
    const users = await db.collection('users').find({
        $or: [
            { email: { $regex: /naveenpvn1702/i } },
            { phone: { $regex: /9597127158/i } },
            { phone: { $regex: /95971 27158/i } }
        ]
    }).toArray();

    for (const user of users) {
      console.log(`\nFound User: ${user.email} (Phone: ${user.phone})`);
      await db.collection('orgmemberships').deleteMany({ userId: user._id });
      await db.collection('tokens').deleteMany({ userId: user._id });
      await db.collection('useridentities').deleteMany({ userId: user._id });
      await db.collection('sessions').deleteMany({ userId: user._id });
      
      const updateVillas = await db.collection('villas').updateMany(
        { "residents.user": user._id },
        { $pull: { residents: { user: user._id } } }
      );
      
      await db.collection('users').deleteOne({ _id: user._id });
      console.log(`- Deleted user record entirely.`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDone.");
  }
}

cleanData();
