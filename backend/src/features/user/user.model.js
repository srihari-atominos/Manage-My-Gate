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
      enum: ['Pending', 'Active', 'Inactive'],
      default: 'Pending',
    },
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    ssoProvider: {
      type: String,
      enum: ['google', 'microsoft', 'none'],
      default: 'none',
    },
    ssoId: {
      type: String,
      sparse: true,
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
    roles: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        index: true,
      }],
      required: [true, 'At least one role is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A user must have at least one role assigned.',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
export default User;
