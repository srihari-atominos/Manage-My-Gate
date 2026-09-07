import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Community ID is required'],
      index: true,
    },
    villaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      required: false,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Assessment name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['RECURRING', 'ONE_TIME', 'CAPITAL_REPAIR'],
        message: 'Type must be RECURRING, ONE_TIME, or CAPITAL_REPAIR',
      },
      required: [true, 'Assessment type is required'],
    },
    billingCycle: {
      type: String,
      enum: {
        values: ['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'WEEKLY', 'AD_HOC'],
        message: 'Billing cycle must be MONTHLY, QUARTERLY, ANNUALLY, WEEKLY, or AD_HOC',
      },
      required: [true, 'Billing cycle is required'],
    },
    generationDay: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Generation day is required'],
      validate: {
        validator: function (value) {
          if (value === 'LAST_DAY_OF_MONTH') return true;
          if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 28) return true;
          return false;
        },
        message: (props) =>
          `${props.value} is not a valid generation day. It must be an integer between 0 and 28 or the exact string 'LAST_DAY_OF_MONTH'.`,
      },
    },
    selectedDays: {
      type: [Number],
      default: [],
    },
    triggerMode: {
      type: String,
      enum: ['IMMEDIATE', 'SCHEDULED'],
      default: 'IMMEDIATE',
    },
    scheduledDateTime: {
      type: Date,
      default: null,
    },
    collectionMethod: {
      type: String,
      enum: ['LUMP_SUM', 'INSTALLMENT'],
      default: 'LUMP_SUM',
    },
    totalInstallments: {
      type: Number,
      default: 1,
    },
    targetScope: {
      type: {
        type: String,
        enum: {
          values: ['ALL_COMMUNITY', 'VILLA_BLOCK', 'UNIT_TYPE', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'],
          message: 'Target scope type is invalid',
        },
        required: [true, 'Target scope type is required'],
      },
      scopeIds: {
        type: [{
          type: mongoose.Schema.Types.Mixed,
          index: true,
        }],
        default: [],
      },
      targetRole: {
        type: String,
        enum: {
          values: ['TENANT', 'OWNER', 'BOTH'],
          message: 'Target role must be TENANT, OWNER, or BOTH',
        },
        default: 'OWNER',
      },
      targetRoleIds: {
        type: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
          index: true,
        }],
        default: [],
      },
    },
    calculationMethod: {
      type: {
        type: String,
        enum: {
          values: ['FLAT_RATE', 'PER_SQ_FT', 'TIERED_BHK'],
          message: 'Calculation method type is invalid',
        },
        required: [true, 'Calculation method type is required'],
      },
      flatAmount: {
        type: Number,
        default: 0,
        min: [0, 'Flat amount cannot be negative'],
      },
      ratePerSqFt: {
        type: Number,
        default: 0,
        min: [0, 'Rate per square foot cannot be negative'],
      },
      tieredRates: {
        studio: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
        bhk1: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
        bhk2: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
        bhk3: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
        bhk4: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
        penthouse: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
        duplex: { type: Number, default: 0, min: [0, 'Tier rate cannot be negative'] },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastBilledPeriod: {
      type: String,
      default: null,
    },
    lastRunStats: {
      created: { type: Number, default: 0 },
      duplicatesSkipped: { type: Number, default: 0 },
      totalTargeted: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
