import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const bulkValidateUsers = await import('./src/features/user/user.services.js').then(m => m.default.bulkValidateUsers.bind(m.default));

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const res = await bulkValidateUsers([{email: "naveen@atominosconsulting.com"}], "6abe4b2574e9b00aeb55ef72");
    console.log(res);
  } catch (e) { console.error(e.message); }
  mongoose.disconnect();
}
check();
