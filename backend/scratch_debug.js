import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function run() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Import models dynamically
    const User = (await import('./src/features/user/user.model.js')).default;
    const Organization = (await import('./src/features/organization/organization.model.js')).default;
    const OrgMembership = (await import('./src/features/orgMembership/orgMembership.model.js')).default;

    const email = 'srihari@atominosconsulting.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found by email:', email);
      const allUsers = await User.find({}, { email: 1, username: 1 });
      console.log('All users in DB:', allUsers);
      await mongoose.disconnect();
      return;
    }

    console.log('Found User:', {
      _id: user._id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      status: user.status
    });

    const platformOrg = await Organization.findOne({ isPlatform: true });
    if (!platformOrg) {
      console.log('Platform Org not found!');
    } else {
      console.log('Platform Org:', {
        _id: platformOrg._id,
        name: platformOrg.name,
        isPlatform: platformOrg.isPlatform,
        status: platformOrg.status
      });
    }

    const memberships = await OrgMembership.find({ userId: user._id }).populate('orgId');
    console.log('Memberships found count:', memberships.length);
    memberships.forEach(m => {
      console.log('Membership:', {
        _id: m._id,
        orgId: m.orgId ? m.orgId._id : null,
        orgName: m.orgId ? m.orgId.name : 'Unknown',
        orgIsPlatform: m.orgId ? m.orgId.isPlatform : false,
        orgStatus: m.orgId ? m.orgId.status : 'Unknown',
        roleId: m.roleId,
        roleIds: m.roleIds,
        status: m.status
      });
    });

    await mongoose.disconnect();
    console.log('Disconnected!');
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
