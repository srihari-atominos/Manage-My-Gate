import mongoose from 'mongoose';
const bookingRulesSchema = new mongoose.Schema({
  slotDurationMinutes: { type: Number, required: true, default: 60 },
  maxBookingsPerUserPerSlot: { type: Number, required: true, default: 1 },
}, { _id: false });

const amenitySchema = new mongoose.Schema({
  bookingRules: { type: bookingRulesSchema, required: true }
});

const Amenity = mongoose.model('AmenityTest', amenitySchema);

const doc = new Amenity({
  bookingRules: {
    slotDurationMinutes: 30
  }
});
console.log(doc.bookingRules.maxBookingsPerUserPerSlot);
const err = doc.validateSync();
console.log(err ? err.message : 'No error');
