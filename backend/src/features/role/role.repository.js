import Role from './role.model.js';

export class RoleRepository {
  async findAll() {
    return await Role.find({}).sort({ name: 1 });
  }

  async findById(id) {
    return await Role.findById(id);
  }

  async findByName(name) {
    return await Role.findOne({ name });
  }

  async create(roleData) {
    const role = new Role(roleData);
    return await role.save();
  }

  async update(id, updateData) {
    return await Role.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Role.findByIdAndDelete(id);
  }
}

export default new RoleRepository();
