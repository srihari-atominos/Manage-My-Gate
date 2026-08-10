import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const enquirySchema = new mongoose.Schema(
  {
    // User Information
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    
    // Organization Information
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    totalUnits: {
      type: Number,
      required: [true, 'Total units is required'],
      min: [1, 'Total units must be a positive number'],
    },
    
    // Feature Information
    selectedFeatures: {
      type: [String],
      default: [],
    },
    
    // CRM Information
    enquiryId: {
      type: String,
      default: () => `ENQ-${uuidv4().split('-')[0].toUpperCase()}`,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['New', 'Contacted', 'Demo Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'],
        message: '{VALUE} is not a valid status',
      },
      default: 'New',
      index: true,
    },
    source: {
      type: String,
      default: 'Website Registration',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Enquiry = mongoose.model('Enquiry', enquirySchema);

export default Enquiry;
