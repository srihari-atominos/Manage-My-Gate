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

    const VisitorPass = (await import('./src/features/visitorPass/visitorPass.model.js')).default;
    
    // Create dummy IDs for reference
    const orgId = new mongoose.Types.ObjectId();
    const createdById = new mongoose.Types.ObjectId();

    const passTypes = [
      {
        name: 'GUEST (Single Entry)',
        payload: {
          orgId,
          createdById,
          passType: 'GUEST',
          isGroupPass: false,
          visitorDetails: {
            name: 'John Doe',
            phone: '1234567890'
          },
          validity: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000)
          }
        }
      },
      {
        name: 'GUEST (Group Pass)',
        payload: {
          orgId,
          createdById,
          passType: 'GUEST',
          isGroupPass: true,
          purpose: 'Birthday Party',
          groupGuests: [
            { name: 'Alice', phone: '1111111111' },
            { name: 'Bob', phone: '2222222222' }
          ],
          validity: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000)
          }
        }
      },
      {
        name: 'CAB',
        payload: {
          orgId,
          createdById,
          passType: 'CAB',
          vehicleDetails: {
            vendor: 'Uber',
            number: 'KA01AB1234',
            vehicleType: 'CAB'
          },
          validity: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000)
          }
        }
      },
      {
        name: 'DELIVERY',
        payload: {
          orgId,
          createdById,
          passType: 'DELIVERY',
          deliveryDetails: {
            partner: 'Amazon',
            orderId: 'AMZ-12345',
            packageCount: 2,
            deliveryAction: 'DOORSTEP'
          },
          validity: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 3600000)
          }
        }
      },
      {
        name: 'SERVICE',
        payload: {
          orgId,
          createdById,
          passType: 'SERVICE',
          serviceDetails: {
            category: 'Maid',
            notes: 'Daily cleaning'
          },
          visitorDetails: {
            name: 'Jane Smith',
            phone: '9999999999'
          },
          validity: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000), // 30 days
            timeWindowStart: '08:00',
            timeWindowEnd: '12:00',
            allowedDays: [1, 2, 3, 4, 5] // Mon-Fri
          }
        }
      }
    ];

    for (const testCase of passTypes) {
      console.log(`\n--- Testing ${testCase.name} ---`);
      try {
        const pass = new VisitorPass(testCase.payload);
        const validationError = pass.validateSync();
        if (validationError) {
          console.error(`Validation Failed for ${testCase.name}:`, validationError.message);
        } else {
          console.log(`Validation Passed for ${testCase.name}!`);
          // We won't actually save to avoid cluttering the DB, but we can verify it works.
          // await pass.save(); 
          console.log(`Simulated Save Successful. Generated Pass Data:`);
          console.log(JSON.stringify(pass.toJSON(), null, 2));
        }
      } catch (err) {
        console.error(`Error processing ${testCase.name}:`, err.message);
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected!');
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
