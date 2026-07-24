import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
    moduleName: {
      type: String,
      required: true,
      trim: true,
    },
    moduleKey: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    sidebarVisible: {
      type: Boolean,
      default: true,
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);



const workspaceSchema = new mongoose.Schema(
  {
    workspaceName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending'],
      default: 'Active',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    modules: [moduleSchema],
  },
  {
    timestamps: true,
  }
);

// Ensure workspaceName is unique within an organization
workspaceSchema.index({ workspaceName: 1, organizationId: 1 }, { unique: true });

export const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
