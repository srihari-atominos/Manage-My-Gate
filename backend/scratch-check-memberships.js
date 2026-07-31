import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

mongoose.connect(uri).then(async () => {
  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false }));
  const users = await OrgMembership.find({ 'userId': new mongoose.Types.ObjectId('6a684558004a8897e2089d70') });
  console.log('Memberships for naveenpv5886:', JSON.stringify(users, null, 2));
  
  mongoose.disconnect();
}).catch(console.error);
