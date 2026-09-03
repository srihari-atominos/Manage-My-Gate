import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false, collection: 'orgmemberships' }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));

  const user = await User.findOne({ email: 'kavyat2201@gmail.com' });
  if (user) {
    const memberships = await OrgMembership.find({ userId: user._id });
    console.log('\nMemberships for kavyat2201@gmail.com:');
    for (const m of memberships) {
      // Resolve role names
      const roleIds = m.roleIds || (m.roleId ? [m.roleId] : []);
      const roles = await Role.find({ _id: { $in: roleIds } });
      console.log(`- ID: ${m._id}, OrgId: ${m.orgId}, RoleIds: ${roleIds}, Roles: ${roles.map(r => r.name)}, ResidentType: ${m.residentType}, Status: ${m.status}`);
    }
  }

  const user2 = await User.findOne({ email: 'family1@globalcom927.com' });
  if (user2) {
    const memberships2 = await OrgMembership.find({ userId: user2._id });
    console.log('\nMemberships for family1@globalcom927.com:');
    for (const m of memberships2) {
      const roleIds = m.roleIds || (m.roleId ? [m.roleId] : []);
      const roles = await Role.find({ _id: { $in: roleIds } });
      console.log(`- ID: ${m._id}, OrgId: ${m.orgId}, RoleIds: ${roleIds}, Roles: ${roles.map(r => r.name)}, ResidentType: ${m.residentType}, Status: ${m.status}`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
