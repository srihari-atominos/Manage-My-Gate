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

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    details: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const workspaceSchema = new mongoose.Schema(
  {
    workspaceName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
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
    timeZone: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    activityLogs: [activityLogSchema],
    modules: [moduleSchema],
  },
  {
    timestamps: true,
  }
);

// Ensure workspaceName is unique within an organization
workspaceSchema.index({ workspaceName: 1, organizationId: 1 }, { unique: true });

// Document lifecycle hooks to synchronize name and workspaceName
workspaceSchema.post('init', function(doc) {
  if (!doc.workspaceName && doc.name) {
    doc.workspaceName = doc.name;
  } else if (!doc.name && doc.workspaceName) {
    doc.name = doc.workspaceName;
  }
});

workspaceSchema.pre('validate', function(next) {
  if (this.workspaceName && !this.name) {
    this.name = this.workspaceName;
  } else if (this.name && !this.workspaceName) {
    this.workspaceName = this.name;
  }
  next();
});

workspaceSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update) {
    if (update.workspaceName && !update.name) {
      update.name = update.workspaceName;
    } else if (update.name && !update.workspaceName) {
      update.workspaceName = update.name;
    }
    if (update.$set) {
      if (update.$set.workspaceName && !update.$set.name) {
        update.$set.name = update.$set.workspaceName;
      } else if (update.$set.name && !update.$set.workspaceName) {
        update.$set.workspaceName = update.$set.name;
      }
    }
  }
});

export const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
