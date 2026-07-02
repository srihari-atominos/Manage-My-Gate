import mongoose from 'mongoose';

const operatingHoursSchema = new mongoose.Schema({
  start: {
    type: String,
    required: [true, 'Operating hours start time is required'],
    match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please provide a valid time format (HH:MM)']
  },
  end: {
    type: String,
    required: [true, 'Operating hours end time is required'],
    match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please provide a valid time format (HH:MM)']
  }
}, { _id: false });

const amenitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Amenity name is required'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Amenity location is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Amenity category is required'],
    enum: ['Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness'],
  },
  capacity: {
    type: Number,
    required: [true, 'Amenity capacity is required'],
    min: [1, 'Capacity must be at least 1'],
  },
  ratePerHour: {
    type: Number,
    default: 0,
    min: [0, 'Rate cannot be negative'],
  },
  operatingHours: {
    type: operatingHoursSchema,
    required: [true, 'Operating hours are required']
  },
  openDays: {
    type: [Number],
    required: [true, 'Open days are required'],
    validate: {
      validator: function(v) {
        return v.every(day => day >= 0 && day <= 6);
      },
      message: 'Open days must be an array of numbers between 0 and 6 (Sunday=0)'
    }
  },
  imageUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance'],
    default: 'Active'
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Amenity', amenitySchema);
