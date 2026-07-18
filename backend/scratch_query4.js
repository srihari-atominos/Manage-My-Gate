import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection;
  const user = await db.collection('users').findOne({email:'testuser@example.com'});
  console.log("testuser:", JSON.stringify(user, null, 2));
  
  const user2 = await db.collection('users').findOne({email:'naveenpv58586@gmail.com'});
  console.log("naveen:", JSON.stringify(user2, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
