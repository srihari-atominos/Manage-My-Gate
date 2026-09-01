import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const orgId = new mongoose.Types.ObjectId('6a6c7ee2917e74da9ed60108');
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Villa = mongoose.model('Villa', new mongoose.Schema({}, { strict: false }));
  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false }));

  const roles = await Role.find({ orgId }).lean();
  const roleIds = roles.map(r => r._id);
  const roleMap = Object.fromEntries(roles.map(r => [r._id.toString(), r.name]));

  const users = await User.find({ roles: { $in: roleIds } }).lean();
  const villas = await Villa.find({ orgId }).lean();

  console.log('=== COMMUNITY: Greenfield Heights Community ===');
  console.log('Total Users:', users.length);
  console.log('Total Units:', villas.length);

  console.log('\n=== USERS IN THIS COMMUNITY ===');
  users.forEach((u, i) => {
    const userRoles = (u.roles || []).map(r => roleMap[r.toString()] || r.toString()).join(', ');
    console.log(`${i + 1}. ${u.name} (${u.email}) - Role: [${userRoles}] - Status: ${u.status}`);
  });

  console.log('\n=== UNITS & USER ATTACHMENTS ===');
  villas.forEach((v, i) => {
    const primaryRes = users.find(u => u._id.toString() === v.primaryResidentId?.toString());
    const residentsList = (v.residents || []).map(r => {
      const u = users.find(user => user._id.toString() === (r.userId?._id || r.userId)?.toString());
      return `${u ? u.name : 'User'} (${r.residencyType || (r.isPrimary ? 'Primary' : 'Resident')})`;
    });

    console.log(
      `${i + 1}. Unit ${v.unitNumber} (${v.blockOrBuilding}) - Status: ${v.status} | Primary Resident: ${primaryRes ? primaryRes.name : 'None'} | Attached Residents: [${residentsList.join(', ')}]`
    );
  });

  process.exit(0);
}

run();
