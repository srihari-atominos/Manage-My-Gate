import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate').then(async () => {
  try {
    const Technician = (await import('./src/features/technician/technician.model.js')).default;
    const User = (await import('./src/features/user/user.model.js')).default;
    const Complaint = (await import('./src/features/complaint/complaint.model.js')).default;
    
    const email = 'naveenpv5886@gmail.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    const oldUserId = new mongoose.Types.ObjectId('6a4798ebd9a6a79d84268f16');
    const newUserId = user._id;
    
    await Technician.updateMany({ email }, { $set: { userId: newUserId } });
    const result = await Complaint.updateMany(
      { assignedTechnicianId: oldUserId }, 
      { $set: { assignedTechnicianId: newUserId } }
    );
    
    console.log('Updated complaints:', result.modifiedCount);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
