import mongoose from 'mongoose';
import config from './src/config/config.js';

async function cleanTimeline() {
  await mongoose.connect(config.mongodb.uri);
  const db = mongoose.connection.db;
  const complaints = await db.collection('complaints').find({}).toArray();
  
  for (const c of complaints) {
    if (!c.timeline || !Array.isArray(c.timeline)) continue;
    let modified = false;
    const newTimeline = [];
    let prevAction = null;
    
    for (const event of c.timeline) {
      if (event.action === 'Assignment Accepted' && prevAction === 'Assignment Accepted') {
        modified = true;
        continue;
      }
      if (event.userName === 'undefined undefined') {
        event.userName = 'Admin';
        modified = true;
      }
      newTimeline.push(event);
      prevAction = event.action;
    }
    
    if (modified) {
      await db.collection('complaints').updateOne({ _id: c._id }, { $set: { timeline: newTimeline } });
      console.log('Cleaned timeline for:', c.complaintNumber);
    }
  }
  console.log('Timeline cleanup complete.');
  await mongoose.disconnect();
}

cleanTimeline().catch(console.error);
