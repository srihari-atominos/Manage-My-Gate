import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ComplaintSettings from './src/features/complaintSettings/complaintSettings.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const defaultCategories = [
  {
    name: 'Plumbing',
    suggestedIssues: [
      { name: 'Kitchen Tap Leakage' }, { name: 'Bathroom Tap Leakage' }, { name: 'Flush Tank Not Working' },
      { name: 'Washbasin Pipe Blocked' }, { name: 'Kitchen Sink Blocked' }, { name: 'No Water Supply in Bathroom' },
      { name: 'Low Water Pressure' }, { name: 'Pipe Burst in Utility' }, { name: 'Sewage Smell from Drain' },
      { name: 'Shower Head Broken' }, { name: 'Geyser Pipe Leaking' }, { name: 'Water Seepage on Ceiling' },
      { name: 'Main Valve Jammed' }
    ]
  },
  {
    name: 'Electrical',
    suggestedIssues: [
      { name: 'Power Outage in Flat' }, { name: 'MCB Tripping Frequently' }, { name: 'Tube Light Replacement' },
      { name: 'Fan Regulator Not Working' }, { name: 'Switch Board Sparking' }, { name: 'Socket Not Working' },
      { name: 'Exhaust Fan Repair' }, { name: 'AC Point Not Working' }, { name: 'Geyser Switch Burnt' },
      { name: 'Intercom Dead' }, { name: 'Door Bell Not Working' }, { name: 'Balcony Light Issue' }
    ]
  },
  {
    name: 'Parking',
    suggestedIssues: [
      { name: 'Someone Parked in My Slot' }, { name: 'Unknown Vehicle in Visitor Parking' }, { name: 'Car Wash Area Dirty' },
      { name: 'Basement Light Not Working' }, { name: 'Pillar Guard Damaged' }, { name: 'Water Logging in Parking' },
      { name: 'Two-Wheeler Parked Improperly' }, { name: 'EV Charger Not Working' }, { name: 'Speed Breaker Damaged' },
      { name: 'Parking Sticker Issue' }
    ]
  },
  {
    name: 'Security',
    suggestedIssues: [
      { name: 'Guard Not Present at Gate' }, { name: 'Unattended Delivery Package' }, { name: 'Visitor Allowed Without Approval' },
      { name: 'Main Gate Boom Barrier Broken' }, { name: 'CCTV Camera Not Pointing Right' }, { name: 'Suspicious Person in Block' },
      { name: 'Maid Registration Issue' }, { name: 'Patrolling Not Done at Night' }, { name: 'Security App Not Syncing' },
      { name: 'ID Card Not Checked' }
    ]
  },
  {
    name: 'Housekeeping',
    suggestedIssues: [
      { name: 'Corridor Not Swept' }, { name: 'Garbage Not Collected' }, { name: 'Dustbin Smelling in Lobby' },
      { name: 'Staircase Dirty' }, { name: 'Lift Not Cleaned' }, { name: 'Clubhouse Restroom Dirty' },
      { name: 'Basement Sweeping Pending' }, { name: 'Dead Bird/Animal in Premises' }, { name: 'Spider Webs in Corridor' },
      { name: 'Staff Misbehavior' }
    ]
  },
  {
    name: 'Amenities',
    suggestedIssues: [
      { name: 'Gym AC Not Working' }, { name: 'Treadmill Belt Broken' }, { name: 'Swimming Pool Water Unclean' },
      { name: 'Clubhouse TV Not Working' }, { name: 'Table Tennis Rackets Missing' }, { name: 'Badminton Court Net Torn' },
      { name: 'Party Hall AC Issue' }, { name: 'Library Lights Not Working' }, { name: 'Steam Room Not Heating' },
      { name: 'Booking Conflict' }
    ]
  },
  {
    name: 'Landscaping',
    suggestedIssues: [
      { name: 'Plants Drying in Garden' }, { name: 'Grass Needs Trimming' }, { name: 'Sprinkler Broken' },
      { name: 'Fallen Branches' }, { name: 'Mosquito Fogging Required' }, { name: 'Snake/Reptile Spotted' },
      { name: 'Weeds Growing on Pathway' }, { name: 'Garden Lights Not Working' }, { name: 'Fountain Not Working' },
      { name: 'Pest Control Needed in Lobby' }
    ]
  },
  {
    name: 'Elevators',
    suggestedIssues: [
      { name: 'Lift Stuck' }, { name: 'Lift Making Noise' }, { name: 'Lift Fan Not Working' },
      { name: 'Lift Light Not Working' }, { name: 'Lift Button Broken' }, { name: 'Lift Door Not Closing' },
      { name: 'Lift Jerking' }, { name: 'Lift Display Blank' }, { name: 'Lift Smelling Bad' },
      { name: 'Lift Overcrowding Issue' }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get all settings
    const allSettings = await ComplaintSettings.find();
    console.log(`Found ${allSettings.length} settings to update.`);
    
    for (const setting of allSettings) {
      setting.categories = defaultCategories;
      await setting.save();
    }
    console.log('Categories seeded successfully for all organizations!');
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
