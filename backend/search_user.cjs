const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
    const db = mongoose.connection.db;

    const users = await db.collection('users').find({
        $or: [
            { email: { $regex: /naveen/i } }
        ]
    }).toArray();

    if (users.length > 0) {
        console.log("Found Users matching 'naveen':");
        for (const user of users) {
            console.log(`- Email: ${user.email}, Phone: ${user.phone}, Name: ${user.name}`);
        }
    } else {
        console.log("No users found matching 'naveen'.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
