import mongoose from 'mongoose';
import User from './src/features/user/user.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Villa from './src/features/villa/villa.model.js';
import Token from './src/features/token/token.model.js';
import Technician from './src/features/technician/technician.model.js';
import Session from './src/features/session/session.model.js';
import UserIdentity from './src/features/userIdentity/userIdentity.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';
const targetEmail = 'naveenpvn1702@gmail.com';
const targetId = '6aa63babed35e6b49d2a8ac1';

async function deleteCompleteUser() {
  try {
    console.log('Connecting to MongoDB at', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Find all users matching email or ID
    const orConditions = [{ email: targetEmail.toLowerCase() }];
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(targetId) });
    }

    const matchedUsers = await User.find({ $or: orConditions });
    console.log(`Found ${matchedUsers.length} user record(s) in User collection.`);

    const userIds = matchedUsers.map(u => u._id);
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      userIds.push(new mongoose.Types.ObjectId(targetId));
    }

    console.log('Target User IDs to purge:', userIds.map(id => id.toString()));

    // 2. Remove OrgMemberships
    const membershipResult = await OrgMembership.deleteMany({
      $or: [
        { userId: { $in: userIds } },
        ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: new mongoose.Types.ObjectId(targetId) }] : [])
      ]
    });
    console.log(`Deleted ${membershipResult.deletedCount} OrgMembership record(s).`);

    // 3. Remove from Villas (residents array, ownerId, primaryResidentId)
    const villas = await Villa.find({
      $or: [
        { 'residents.userId': { $in: userIds } },
        { ownerId: { $in: userIds } },
        { primaryResidentId: { $in: userIds } }
      ]
    });
    console.log(`Found ${villas.length} Villa(s) with user references.`);

    for (const villa of villas) {
      villa.residents = villa.residents.filter(r => !userIds.some(uid => uid.equals(r.userId)));
      if (villa.ownerId && userIds.some(uid => uid.equals(villa.ownerId))) {
        villa.ownerId = null;
      }
      if (villa.primaryResidentId && userIds.some(uid => uid.equals(villa.primaryResidentId))) {
        villa.primaryResidentId = null;
      }
      if (villa.residents.length === 0) {
        villa.status = 'Vacant';
      }
      await villa.save();
      console.log(`Updated Villa ${villa.unitNumber} (${villa.blockOrBuilding || ''})`);
    }

    // 4. Remove Tokens (invitation tokens, reset tokens, etc.)
    const tokenResult = await Token.deleteMany({
      $or: [
        { userId: { $in: userIds } },
        { 'payload.email': targetEmail.toLowerCase() },
        { 'payload.recipientEmail': targetEmail.toLowerCase() }
      ]
    });
    console.log(`Deleted ${tokenResult.deletedCount} Token record(s).`);

    // 5. Remove Technician records
    const techResult = await Technician.deleteMany({
      $or: [
        { userId: { $in: userIds } },
        { email: targetEmail.toLowerCase() }
      ]
    });
    console.log(`Deleted ${techResult.deletedCount} Technician record(s).`);

    // 6. Remove Sessions
    const sessionResult = await Session.deleteMany({
      userId: { $in: userIds }
    });
    console.log(`Deleted ${sessionResult.deletedCount} Session record(s).`);

    // 7. Remove UserIdentities (SSO)
    const identityResult = await UserIdentity.deleteMany({
      userId: { $in: userIds }
    });
    console.log(`Deleted ${identityResult.deletedCount} UserIdentity record(s).`);

    // 8. Delete User record(s)
    const userDeleteResult = await User.deleteMany({
      $or: orConditions
    });
    console.log(`Deleted ${userDeleteResult.deletedCount} User document(s).`);

    console.log(`Purge of user ${targetEmail} and ID ${targetId} completed successfully.`);
  } catch (err) {
    console.error('Error executing deleteCompleteUser:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

deleteCompleteUser();

