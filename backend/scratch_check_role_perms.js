import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const ROLE_ID = '6a9517c48880103df596cd2d';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const RolePermission = mongoose.model('RolePermission', new mongoose.Schema({}, { strict: false, collection: 'rolepermissions' }));
  const Permission = mongoose.model('Permission', new mongoose.Schema({}, { strict: false, collection: 'permissions' }));

  const rps = await RolePermission.find({ roleId: new mongoose.Types.ObjectId(ROLE_ID) });
  const permIds = rps.map(rp => rp.permissionId);
  const perms = await Permission.find({ _id: { $in: permIds } });

  console.log('Permissions:', perms.map(p => `${p.feature}:${p.action}`));
  process.exit(0);
}

run().catch(console.error);
