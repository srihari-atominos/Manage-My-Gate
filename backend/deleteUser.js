import mongoose from 'mongoose';
import { User } from './src/features/user/user.model.js';
import { OrgMembership } from './src/features/orgMembership/orgMembership.model.js';
import { Session } from './src/features/session/session.model.js';
import { Organization } from './src/features/organization/organization.model.js';

async function deleteUser(email) {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User ${email} not found.`);
      process.exit(0);
    }
    
    // First, find any organizations where this user was the only member or owner (Optional cleanup)
    // We'll just delete the user's memberships and sessions for now.
    const membershipsResult = await OrgMembership.deleteMany({ userId: user._id });
    console.log(`Deleted ${membershipsResult.deletedCount} memberships.`);
    
    const sessionsResult = await Session.deleteMany({ userId: user._id });
    console.log(`Deleted ${sessionsResult.deletedCount} sessions.`);
    
    await User.deleteOne({ _id: user._id });
    console.log(`Deleted user ${email}.`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

deleteUser('naveenpv5886@gmail.com');
