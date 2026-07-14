import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, './.env') });

import noticeService from './src/features/noticeBoard/noticeBoard.service.js';
import Notice from './src/features/noticeBoard/noticeBoard.model.js';

// Setup Mock session behavior for non-replica set local MongoDB if needed
// (Mongoose transactions require replica sets in MongoDB, unless mocked as in test-mongo.js)
const originalStartSession = mongoose.startSession.bind(mongoose);
mongoose.startSession = async function(options) {
  const session = await originalStartSession(options);
  session.startTransaction = () => {};
  session.commitTransaction = async () => {};
  session.abortTransaction = async () => {};
  return session;
};

async function testNoticeBoard() {
  console.log('Connecting to database...');
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate', { retryWrites: false });
  console.log('Connected to Database');

  const testOrgId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  try {
    // Clean up any existing notices first
    await Notice.deleteMany({ orgId: testOrgId });

    console.log('\n--- Test Case 1: Create a Published Notice ---');
    const notice1Data = {
      title: 'Annual General Meeting',
      description: 'The annual general meeting for all villa owners will be held this Sunday.',
      category: 'Meetings',
      priority: 'High',
      status: 'Published',
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day in future
      isPinned: false
    };

    const notice1 = await noticeService.createNotice(notice1Data, testUserId, testOrgId);
    console.log('Created Notice 1 successfully:', {
      id: notice1._id,
      title: notice1.title,
      status: notice1.status,
      isPinned: notice1.isPinned
    });

    console.log('\n--- Test Case 2: Create a Pinned Notice (Single Pin Rule) ---');
    const notice2Data = {
      title: 'Water Supply Maintenance',
      description: 'Water supply will be suspended for maintenance from 10 AM to 2 PM.',
      category: 'Maintenance',
      priority: 'Critical',
      status: 'Published',
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days in future
      isPinned: true
    };

    const notice2 = await noticeService.createNotice(notice2Data, testUserId, testOrgId);
    console.log('Created Pinned Notice 2 successfully:', {
      id: notice2._id,
      title: notice2.title,
      status: notice2.status,
      isPinned: notice2.isPinned
    });

    // Check if notice 1 is unpinned (already false, but let's pin it first to see)
    await noticeService.togglePinNotice(notice1._id, true, testUserId, testOrgId);
    console.log('Pinned Notice 1 manually.');

    // Now pin Notice 2
    await noticeService.togglePinNotice(notice2._id, true, testUserId, testOrgId);
    console.log('Pinned Notice 2 manually. Notice 1 should be automatically unpinned.');

    const checkNotice1 = await Notice.findById(notice1._id);
    console.log('Notice 1 pinned state now:', checkNotice1.isPinned); // should be false
    if (checkNotice1.isPinned) {
      throw new Error('Single-pinned notice assertion failed: Notice 1 is still pinned!');
    }
    console.log('Single-pinned notice rule assertion passed!');

    console.log('\n--- Test Case 3: Auto-Expiry on Get/List ---');
    const expiredNoticeData = {
      title: 'Past Notice Event',
      description: 'This is a notice that has expired in the past.',
      category: 'Events',
      priority: 'Low',
      status: 'Published',
      expiryDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      isPinned: false
    };

    const expiredNotice = await noticeService.createNotice(expiredNoticeData, testUserId, testOrgId);
    console.log('Created Notice with past expiry Date:', {
      id: expiredNotice._id,
      title: expiredNotice.title,
      status: expiredNotice.status, // might be Expired on creation check
      expiryDate: expiredNotice.expiryDate
    });

    // Fetch notices via Service
    const noticesList = await noticeService.getAllNotices(testOrgId, testUserId, 1, 10, {});
    console.log(`Fetched ${noticesList.data.length} notices.`);
    
    // Check if the past notice was updated to Expired
    const checkExpired = await Notice.findById(expiredNotice._id);
    console.log('Notice status after listing:', checkExpired.status); // should be Expired
    if (checkExpired.status !== 'Expired') {
      throw new Error('Auto-expiry assertion failed: Notice was not auto-expired!');
    }
    console.log('Auto-expiry rule assertion passed!');

    console.log('\n--- Test Case 4: Search & Filters ---');
    const searchResults = await noticeService.getAllNotices(testOrgId, testUserId, 1, 10, { search: 'Water' });
    console.log(`Search result for "Water" count: ${searchResults.data.length}`);
    if (searchResults.data.length > 0) {
      console.log('Matched notice title:', searchResults.data[0].title);
    }

    const priorityFilterResults = await noticeService.getAllNotices(testOrgId, testUserId, 1, 10, { priority: 'Critical' });
    console.log(`Filter by priority "Critical" count: ${priorityFilterResults.data.length}`);

    console.log('\n--- Test Case 5: Delete Notice ---');
    await noticeService.deleteNotice(notice1._id, testOrgId);
    console.log('Deleted Notice 1.');
    
    try {
      await noticeService.getNoticeById(notice1._id);
      throw new Error('Delete assertion failed: Notice still exists!');
    } catch (err) {
      if (err.statusCode === 404) {
        console.log('Delete assertion passed: Notice no longer exists (404 received).');
      } else {
        throw err;
      }
    }

    console.log('\nAll Notice Board tests passed successfully!');

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up test documents
    await Notice.deleteMany({ orgId: testOrgId });
    console.log('Cleaned up test documents.');
    await mongoose.disconnect();
    console.log('Disconnected database.');
  }
}

testNoticeBoard();
