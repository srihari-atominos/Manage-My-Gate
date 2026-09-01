import mongoose from 'mongoose';
const bookingRulesSchema = new mongoose.Schema({
  slotDurationMinutes: { 
    type: Number, 
    default: 60,
    validate: {
      validator: function(value) {
        if (this.parent && this.parent() && this.parent().pricing && this.parent().pricing.pricingType === 'daily') {
          return true;
        }
        return value != null && value >= 15;
      }
    }
  }
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  pricingType: { type: String }
}, { _id: false });

const amenitySchema = new mongoose.Schema({
  pricing: { type: pricingSchema },
  bookingRules: { type: bookingRulesSchema, required: true }
});

const Amenity = mongoose.model('AmenityParentTest', amenitySchema);

const doc = new Amenity({
  pricing: { pricingType: 'daily' },
  bookingRules: {
    slotDurationMinutes: null
  }
});
const err = doc.validateSync();
console.log('doc 1:', err ? err.message : 'No error');

const doc2 = new Amenity({
  pricing: { pricingType: 'hourly' },
  bookingRules: {
    slotDurationMinutes: null
  }
});
const err2 = doc2.validateSync();
console.log('doc 2:', err2 ? err2.message : 'No error');
