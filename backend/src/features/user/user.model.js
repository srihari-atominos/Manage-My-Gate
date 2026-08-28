import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        return this.status === 'Active';
      },
    },
    status: {
      type: String,
      enum: ['Pending Verification', 'Active', 'Suspended', 'Blocked'],
      default: 'Pending Verification',
    },
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    phoneVerified: {
      type: Boolean,
      default: true,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
    },
    avatar: {
      type: String,
      trim: true,
    },

    villaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      default: null,
    },
    residencyType: {
      type: String,
      default: 'None',
    },
    roles: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        index: true,
      }],
      default: [],
    },
    // Directory Privacy Settings
    showPhoneInDirectory: {
      type: Boolean,
      default: true,
    },
    allowDirectoryMessages: {
      type: Boolean,
      default: true,
    },
    allowIntercomCalls: {
      type: Boolean,
      default: true,
    },
    hideFromDirectory: {
      type: Boolean,
      default: false,
    },
    interests: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
