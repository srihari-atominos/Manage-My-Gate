import Workspace from './workspace.model.js';
import mongoose from 'mongoose';

export class WorkspaceRepository {
  async create(workspaceData, session = null) {
    const workspace = new Workspace(workspaceData);
    return await workspace.save(session ? { session } : undefined);
  }

  async findById(id, session = null) {
    return await Workspace.findById(id).session(session);
  }

  async findOne(query, session = null) {
    return await Workspace.findOne(query).session(session);
  }

  async find(query, session = null) {
    return await Workspace.find(query).session(session);
  }

  async update(id, updateData, session = null) {
    return await Workspace.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true, new: true, ...(session ? { session } : {}) }
    );
  }

  async delete(id, session = null) {
    return await Workspace.findByIdAndDelete(id, session ? { session } : undefined);
  }

  // --- Module Operations ---

  async addModule(workspaceId, moduleData, session = null) {
    return await Workspace.findByIdAndUpdate(
      workspaceId,
      { $push: { modules: moduleData } },
      { returnDocument: 'after', runValidators: true, new: true, ...(session ? { session } : {}) }
    );
  }

  async updateModule(workspaceId, moduleId, moduleData, session = null) {
    // Generate positional update set object
    const updateSet = {};
    for (const [key, value] of Object.entries(moduleData)) {
      updateSet[`modules.$.${key}`] = value;
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(moduleId);
    const query = isMongoId
      ? { _id: workspaceId, 'modules._id': new mongoose.Types.ObjectId(moduleId) }
      : { _id: workspaceId, 'modules.moduleKey': moduleId };

    return await Workspace.findOneAndUpdate(
      query,
      { $set: updateSet },
      { returnDocument: 'after', runValidators: false, new: true, ...(session ? { session } : {}) }
    );
  }

  async deleteModule(workspaceId, moduleId, session = null) {
    const isMongoId = mongoose.Types.ObjectId.isValid(moduleId);
    const pullCondition = isMongoId
      ? { _id: new mongoose.Types.ObjectId(moduleId) }
      : { moduleKey: moduleId };

    return await Workspace.findByIdAndUpdate(
      workspaceId,
      { $pull: { modules: pullCondition } },
      { returnDocument: 'after', new: true, ...(session ? { session } : {}) }
    );
  }

  async reorderModules(workspaceId, modulesList, session = null) {
    return await Workspace.findByIdAndUpdate(
      workspaceId,
      { $set: { modules: modulesList } },
      { returnDocument: 'after', runValidators: true, new: true, ...(session ? { session } : {}) }
    );
  }

  // --- Activity Log Operations ---
  async addActivityLog(workspaceId, logData, session = null) {
    return await Workspace.findByIdAndUpdate(
      workspaceId,
      { $push: { activityLogs: logData } },
      { returnDocument: 'after', new: true, ...(session ? { session } : {}) }
    );
  }
}

export default new WorkspaceRepository();
