const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
    const db = mongoose.connection.db;
    
    const email = 'naveenpvn1702@gmail.com';
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log('User not found.');
      process.exit(0);
    }
    
    const userId = user._id;
    console.log('Deleting user:', email, 'ID:', userId);
    
    // Delete tokens
    const tokens = await db.collection('tokens').deleteMany({ userId });
    console.log('Deleted tokens:', tokens.deletedCount);
    
    // Delete memberships
    const memberships = await db.collection('orgmemberships').deleteMany({ userId });
    console.log('Deleted memberships:', memberships.deletedCount);
    
    // Remove from any units
    const villas = await db.collection('villas').updateMany(
      { 'residents.userId': userId },
      { $pull: { residents: { userId } } }
    );
    console.log('Removed from units:', villas.modifiedCount);
    
    // Delete the user
    const deletedUser = await db.collection('users').deleteOne({ _id: userId });
    console.log('Deleted user:', deletedUser.deletedCount);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
