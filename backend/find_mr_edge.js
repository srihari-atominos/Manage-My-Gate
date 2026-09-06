import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';

async function findMrEdge() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = await User.find({ 
      $or: [
        { name: { $regex: 'edge', $options: 'i' } },
        { username: { $regex: 'edge', $options: 'i' } },
        { firstName: { $regex: 'edge', $options: 'i' } },
        { lastName: { $regex: 'edge', $options: 'i' } }
      ]
    });

    if (users.length === 0) {
      console.log('No user found matching "edge".');
    } else {
      users.forEach(u => {
        console.log(`Found: Name = ${u.name || (u.firstName + ' ' + u.lastName) || u.username}, Email = ${u.email}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMrEdge();
