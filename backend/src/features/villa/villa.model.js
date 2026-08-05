import mongoose from 'mongoose';

const villaSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization (orgId) is required'],
      index: true,
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
      alias: 'villaNumber',
    },
    blockOrBuilding: {
      type: String,
      trim: true,
      default: '',
      alias: 'block',
    },
    floor: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['Studio', 'Apartment', 'Villa', 'Penthouse', 'BHK1', 'BHK2', 'BHK3', 'BHK4', 'Duplex', '1BHA', '2BHA', '3BHA'],
      default: 'Apartment',
    },
    status: {
      type: String,
      enum: ['Vacant', 'Occupied', 'Under Maintenance', 'Under Renovation', 'For Sale', 'For Rent', 'Reserved', 'Inactive'],
      default: 'Vacant',
    },
    primaryResidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    floorAreaSqFt: {
      type: Number,
      default: null,
    },
    metadata: {
      floorPlan: { type: String, trim: true },
      carpetAreaSqFt: { type: Number },
      parkingSlots: [{ type: String, trim: true }]
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    residents: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        residencyType: {
          type: String,
          default: 'Tenant',
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    history: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        residencyType: {
          type: String,
        },
        moveInDate: {
          type: Date,
        },
        moveOutDate: {
          type: Date,
        }
      }
    ],
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index on { orgId: 1, blockOrBuilding: 1, unitNumber: 1 } with unique: true
// to prevent duplicate unit numbers within the same block in an organization,
// while allowing identical unit numbers across different blocks.
villaSchema.index({ orgId: 1, blockOrBuilding: 1, unitNumber: 1 }, { unique: true });

export const Villa = mongoose.model('Villa', villaSchema);
export default Villa;
