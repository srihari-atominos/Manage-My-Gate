const mongoose = require('mongoose');

async function checkUser() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
    console.log('Connected to DB.');
    
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ username: 'testuser' });
    console.log('User:', user);
    
    if (user) {
      const memberships = await db.collection('orgmemberships').find({ userId: user._id }).toArray();
      console.log('Memberships:', memberships);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
