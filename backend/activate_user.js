import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  const email = 'resident.tenant@example.com';
  const newPassword = 'password123';

  // Find the user
  const user = await usersCollection.findOne({ email });
  if (!user) {
    console.log(`User ${email} not found!`);
    process.exit(1);
  }

  console.log(`Found user: ${user.firstName} ${user.lastName} (${user._id})`);

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update user
  const result = await usersCollection.updateOne(
    { email },
    { 
      $set: { 
        password: hashedPassword,
        status: 'Active',
        isActive: true
      } 
    }
  );

  console.log('Update result:', result);
  console.log(`Successfully activated user and updated password for ${email}`);

  await mongoose.disconnect();
}

main().catch(console.error);
