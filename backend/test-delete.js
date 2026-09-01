import mongoose from 'mongoose';
import config from './src/config/config.js';
import Complaint from './src/features/complaint/complaint.model.js';

async function test() {
  try {
    await mongoose.connect(config.mongodb.url);
    console.log("Connected to MongoDB");
    const complaint = await Complaint.findOne();
    if (!complaint) {
      console.log("No complaints found");
      process.exit(0);
    }
    console.log("Found complaint:", complaint._id);
    const result = await Complaint.findOneAndDelete({ _id: complaint._id, orgId: complaint.orgId });
    console.log("Deleted result:", result ? result._id : null);
    
    // Verify it's gone
    const verify = await Complaint.findById(complaint._id);
    console.log("Verify:", verify);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
