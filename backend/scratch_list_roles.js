import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));
  const roles = await Role.find({ orgId: new mongoose.Types.ObjectId('6a95189f8880103df596ce33') });
  console.log('Roles for Org atominos:');
  roles.forEach(r => {
    console.log(`- ID: ${r._id}, Name: ${r.name}`);
  });

  process.exit(0);
}

run().catch(console.error);
