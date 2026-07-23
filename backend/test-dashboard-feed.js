import mongoose from 'mongoose';
import dashboardFeedService from './src/features/dashboardFeed/dashboardFeed.service.js';

mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate').then(async () => {
  const User = (await import('./src/features/user/user.model.js')).default;
  const noticeBoardService = (await import('./src/features/noticeBoard/noticeBoard.service.js')).default;
  const amenityService = (await import('./src/features/amenity/amenity.services.js')).default;
  const u = await User.findOne({ status: 'Active' });
  if (u) {
    const orgId = u.orgId;
    const userId = u._id;
    const notices = await noticeBoardService.getAllNotices(orgId, userId, 1, 50, { status: 'Published' }, true);
    console.log('Notices:', JSON.stringify(notices, null, 2));
    
    const amenities = await amenityService.getAllAmenities(orgId, {});
    console.log('Amenities with maintenance:', amenities.data.filter(a => a.maintenanceSchedules?.length > 0));

    const feed = await dashboardFeedService.getUnifiedAnnouncements(orgId, userId);
    console.log('Success:', feed);
  } else {
    console.log('No user');
  }
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  mongoose.disconnect();
});
