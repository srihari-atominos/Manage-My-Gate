import mongoose from 'mongoose';
async function checkUser() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ email: { $regex: 'guard', $options: 'i' } }).toArray();
    console.log(users.map(u => u.email));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
checkUser();
