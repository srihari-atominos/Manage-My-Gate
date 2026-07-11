import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const orgMemberships = db.collection('orgmemberships');
  const rolesCollection = db.collection('roles');

  const admin = await usersCollection.findOne({ email: 'testuser@example.com' });

  const adminMemberships = await orgMemberships.find({ userId: admin._id }).toArray();
  
  for (const m of adminMemberships) {
    console.log('Membership:', m._id);
    console.log('roleId:', m.roleId);
    console.log('roleIds:', m.roleIds);
    if (m.roleId) {
      const role = await rolesCollection.findOne({ _id: m.roleId });
      console.log('Role Name (single):', role?.name);
    }
    if (m.roleIds && m.roleIds.length > 0) {
      for (const rId of m.roleIds) {
         const role = await rolesCollection.findOne({ _id: rId });
         console.log('Role Name (array):', role?.name);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
