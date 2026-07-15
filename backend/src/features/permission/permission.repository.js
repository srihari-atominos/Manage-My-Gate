import Permission from './permission.model.js';

export class PermissionRepository {
  async findAll() {
    return await Permission.find({}).sort({ name: 1 });
  }

  async findById(id) {
    return await Permission.findById(id);
  }

  async findByName(name) {
    return await Permission.findOne({ name });
  }

  async create(permissionData) {
    const permission = new Permission(permissionData);
    return await permission.save();
  }

  async upsert(feature, action) {
    const name = `${feature}:${action}`;
    return await Permission.findOneAndUpdate(
      { name },
      { feature, action, name },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
  }
}

export default new PermissionRepository();
