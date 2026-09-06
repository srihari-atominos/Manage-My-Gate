import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';
import Villa from './src/features/villa/villa.model.js';
import Organization from './src/features/organization/organization.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';

async function fixUserAssignment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: 'kayal@test.com' });
    const org = await Organization.findOne();
    const villa = await Villa.findOne({ type: 'BHK1', orgId: org._id });

    if (!user || !org || !villa) {
       console.log('Missing basic data');
       process.exit(1);
    }

    // 1. Update User Record
    user.villaId = villa._id;
    user.residencyType = 'Resident Owner';
    await user.save();
    console.log('User record updated');

    // 2. Setup OrgMembership
    let membership = await OrgMembership.findOne({ userId: user._id, orgId: org._id });
    if (!membership) {
        membership = await OrgMembership.create({
            userId: user._id,
            orgId: org._id,
            status: 'Active',
            units: [{
                villaId: villa._id,
                residentType: 'Resident Owner'
            }],
            villaId: villa._id,
            residentType: 'Resident Owner'
        });
        console.log('OrgMembership created');
    } else {
        const hasUnit = membership.units.some(u => u.villaId.toString() === villa._id.toString());
        if (!hasUnit) {
            membership.units.push({
                villaId: villa._id,
                residentType: 'Resident Owner'
            });
            membership.status = 'Active';
            membership.villaId = villa._id; // legacy field
            await membership.save();
            console.log('OrgMembership updated with unit');
        } else {
            console.log('OrgMembership already has this unit');
            if (membership.status !== 'Active') {
                membership.status = 'Active';
                await membership.save();
                console.log('OrgMembership set to Active');
            }
        }
    }

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserAssignment();
