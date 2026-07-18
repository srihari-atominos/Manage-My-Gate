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
      enum: ['Resident Owner', 'Tenant', 'Family Member', 'Non-Resident Owner', 'Staff', 'None'],
      default: 'None',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
export default User;
