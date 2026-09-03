import mongoose from 'mongoose';
import Amenity from './src/features/amenity/amenity.model.js';

async function test() {
  try {
    const data = {
        name: 'Test Amenity',
        type: 'Event Space',
        orgId: new mongoose.Types.ObjectId(),
        bookingRules: {
          openTime: '08:00',
          closeTime: '21:00',
          slotDurationMinutes: null,
        }
    };
    
    const amenity = new Amenity(data);
    await amenity.validate();
    console.log("Passed");
  } catch(e) {
    console.log(e.message);
  }
}
test();
