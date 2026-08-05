import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function checkAdmin() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Organization = mongoose.model('Organization', new mongoose.Schema({
    name: String,
    status: String,
    isPlatform: Boolean
  }));

  const Role = mongoose.model('Role', new mongoose.Schema({
    name: String,
    orgId: mongoose.Schema.Types.ObjectId
  }));

  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    villaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Villa' },
    status: String
  }));

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    username: String
  }));

  const admin = await User.findOne({ email: 'admin@enterprise.com' }).lean();
  console.log('\n--- ADMIN USER ---');
  console.log(JSON.stringify(admin, null, 2));

  if (admin) {
    const memberships = await OrgMembership.find({ userId: admin._id })
      .populate('orgId')
      .populate('roleIds')
      .lean();
    console.log('\n--- MEMBERSHIPS FOR ADMIN ---');
    console.log(JSON.stringify(memberships, null, 2));
  }

  const allOrgs = await Organization.find({}).lean();
  console.log('\n--- ALL ORGANIZATIONS IN DB ---');
  console.log(JSON.stringify(allOrgs, null, 2));

  await mongoose.disconnect();
}

checkAdmin().catch(console.error);
