import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const phone = '+919786608686';
  const trimmedPhone = phone.trim();
  const basePhone = trimmedPhone.replace(/^\+\d+\s*/, '');

  console.log({ trimmedPhone, basePhone });

  const user = await User.findOne({ 
    $or: [
      { phone: trimmedPhone },
      { phone: basePhone }
    ]
  });

  console.log("Found User:", user ? user.email : "Not Found");
  process.exit(0);
}

run().catch(console.error);
