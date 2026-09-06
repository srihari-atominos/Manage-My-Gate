import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const User = (await import('./src/features/user/user.model.js')).default;
    const Villa = (await import('./src/features/villa/villa.model.js')).default;
    const Organization = (await import('./src/features/organization/organization.model.js')).default;

    // 1. Find the first valid Organization in the database
    const org = await Organization.findOne({ name: { $nin: ['comm', 'Complex User Testing Society'] } });
    if (!org) {
      throw new Error("Could not find any main organization!");
    }
    console.log(`Found your existing Organization: ${org.name} (${org._id})`);

    // 2. Create the Complex User
    const complexUser = new User({
      name: 'Mr. Complex Edgecase',
      username: `complexowner_final`,
      email: `complex.owner@gmail.com`,
      phone: `8888888888`,
      password: 'SecurePassword123!',
      status: 'Active',
      orgId: org._id
    });
    await complexUser.save();
    console.log(`Created User: ${complexUser.name} (${complexUser._id})`);

    // 3. Create Unit A (Owned by the user, but rented out to someone else)
    const unitA = new Villa({
      orgId: org._id,
      unitNumber: 'A-101',
      blockOrBuilding: 'Block A',
      type: 'Apartment',
      status: 'Occupied',
      ownerId: complexUser._id, // User owns this
      floorAreaSqFt: 1500,
      residents: [
        {
          userId: new mongoose.Types.ObjectId(), // Dummy Tenant User ID
          residencyType: 'Resident Tenant',
          isPrimary: true
        },
        {
          userId: complexUser._id,
          residencyType: 'Non-Resident Owner', // User does not live here
          isPrimary: false
        }
      ]
    });
    await unitA.save();
    console.log(`Created Unit A (Owned by User, Rented Out): ${unitA.blockOrBuilding} - ${unitA.unitNumber}`);

    // 4. Create Unit B (User lives here as a tenant, does not own it)
    const unitB = new Villa({
      orgId: org._id,
      unitNumber: 'B-202',
      blockOrBuilding: 'Block B',
      type: 'Apartment',
      status: 'Occupied',
      ownerId: new mongoose.Types.ObjectId(), // Dummy Owner User ID
      floorAreaSqFt: 1200,
      primaryResidentId: complexUser._id,
      residents: [
        {
          userId: complexUser._id,
          residencyType: 'Resident Tenant', // User lives here as a tenant
          isPrimary: true
        }
      ]
    });
    await unitB.save();
    console.log(`Created Unit B (User lives here as Tenant): ${unitB.blockOrBuilding} - ${unitB.unitNumber}`);

    console.log('\n--- Summary ---');
    console.log(`User ${complexUser.name} successfully linked to two units:`);
    console.log(`1. Non-Resident Owner of ${unitA.unitNumber}`);
    console.log(`2. Resident Tenant of ${unitB.unitNumber}`);

    await mongoose.disconnect();
    console.log('\nDisconnected successfully.');
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
