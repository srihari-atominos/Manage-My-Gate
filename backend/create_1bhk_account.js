import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Villa from './src/features/villa/villa.model.js';
import User from './src/features/user/user.model.js';
import Organization from './src/features/organization/organization.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Role from './src/features/role/role.model.js';
import bcrypt from 'bcrypt';

async function create1BhkAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev');
    console.log('Connected to MongoDB');

    // Get the first organization
    const org = await Organization.findOne();
    if (!org) {
      console.log('No organization found.');
      process.exit(1);
    }

    const email = '1bhk@test.com';
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Create or find user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: '1bhkowner',
        firstName: 'One',
        lastName: 'BHK Owner',
        email: email,
        password: passwordHash,
        status: 'Active',
        isEmailVerified: true,
      });
      console.log('Created user:', user.email);
    } else {
      user.password = passwordHash;
      await user.save();
      console.log('Updated user password:', user.email);
    }

    // Create or find Villa
    const unitNumber = '101-BHK1';
    let villa = await Villa.findOne({ orgId: org._id, unitNumber });
    if (!villa) {
      villa = await Villa.create({
        orgId: org._id,
        unitNumber,
        blockOrBuilding: 'Block C',
        type: 'BHK1',
        status: 'Occupied',
        ownerId: user._id,
        primaryResidentId: user._id,
        floorAreaSqFt: 600, // example 1 BHK size
        residents: [
          { userId: user._id, residencyType: 'Owner', isPrimary: true }
        ]
      });
      console.log('Created 1 BHK Villa:', villa.unitNumber);
    } else {
      console.log('1 BHK Villa already exists:', villa.unitNumber);
      // update owner if needed
      villa.ownerId = user._id;
      villa.primaryResidentId = user._id;
      if (!villa.residents.find(r => r.userId.toString() === user._id.toString())) {
        villa.residents.push({ userId: user._id, residencyType: 'Owner', isPrimary: true });
      }
      await villa.save();
    }

    // Link user to villa
    user.villaId = villa._id;
    user.residencyType = 'Owner';
    await user.save();
    
    // Ensure OrgMembership exists
    let role = await Role.findOne({ name: 'Resident Owner', orgId: org._id });
    if (!role) {
      role = await Role.findOne({ name: 'Resident Owner' }); // fallback
    }
    
    let membership = await OrgMembership.findOne({ userId: user._id, orgId: org._id });
    if (!membership) {
      membership = await OrgMembership.create({
        userId: user._id,
        orgId: org._id,
        status: 'Active',
        roleId: role ? role._id : null
      });
      console.log('Created OrgMembership for user with role Resident Owner');
    } else {
      membership.roleId = role ? role._id : null;
      await membership.save();
      console.log('Updated OrgMembership role to Resident Owner');
    }

    console.log('Linked user to 1 BHK villa and org successfully!');

    console.log('\n--- Account Details ---');
    console.log('Email:', email);
    console.log('Password: Password@123');
    console.log('Unit:', villa.unitNumber);
    console.log('Type:', villa.type);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

create1BhkAccount();
