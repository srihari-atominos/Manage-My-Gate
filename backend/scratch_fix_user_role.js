import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));

  const user = await User.findOne({ email: 'kavyat2201@gmail.com' });
  if (!user) {
    console.error('User kavyat2201@gmail.com not found!');
    process.exit(1);
  }

  // Find Family Member role for atominos org
  const role = await Role.findOne({ name: 'Family Member', orgId: new mongoose.Types.ObjectId('6a95189f8880103df596ce33') });
  if (!role) {
    console.error('Family Member Role not found!');
    process.exit(1);
  }

  await User.updateOne({ _id: user._id }, { $set: { roles: [role._id] } });
  console.log(`Successfully assigned role "Family Member" (${role._id}) to user kavyat2201@gmail.com`);

  process.exit(0);
}

run().catch(console.error);
