const mongoose = require('mongoose');

async function checkUser() {
  try {
    await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
    const db = mongoose.connection.db;
    
    const email = 'naveenpv5886@gmail.com';
    const phoneSegment = '9786608686';

    const userByEmail = await db.collection('users').findOne({ email: email });
    console.log(`--- User by Email (${email}) ---`);
    if (userByEmail) {
        console.log(`Found! Phone associated: ${userByEmail.phone}`);
    } else {
        console.log("Not found.");
    }

    const userByPhone = await db.collection('users').findOne({ phone: { $regex: phoneSegment } });
    console.log(`\n--- User by Phone (*${phoneSegment}) ---`);
    if (userByPhone) {
        console.log(`Found! Email associated: ${userByPhone.email}`);
        if (userByEmail && userByPhone._id.toString() === userByEmail._id.toString()) {
            console.log("✅ These are the exact same user record.");
        } else {
            console.log("❌ Warning: This phone number is connected to a DIFFERENT user record!");
        }
    } else {
        console.log("Not found in any user record.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
