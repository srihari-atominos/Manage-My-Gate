
import mongoose from 'mongoose';
import Technician from './src/features/technician/technician.model.js';

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const orgId = new mongoose.Types.ObjectId();
  const tech = await Technician.create({
    orgId, name: 'kavvi', phone: '7872839382', email: 'jd@gmail.com', department: 'Electrical', type: 'In-House Staff', status: 'Pending'
  });
  console.log('Created:', tech._id);
  
  try {
    const res = await Technician.findOneAndUpdate(
      { _id: tech._id, orgId, isDeleted: false },
      { $set: { name: 'kavvi2', specialization: 'Electrical' } },
      { returnDocument: 'after', runValidators: true }
    );
    console.log('Update Success', res.name);
  } catch (err) {
    console.error('Update Error:', err.message);
  }
  await mongoose.disconnect();
}
test();

