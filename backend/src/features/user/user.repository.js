import User from './user.model.js';

export class UserRepository {
  async findById(id) {
    return await User.findById(id).populate('roleId');
  }

  async findByEmail(email) {
    return await User.findOne({ email }).populate('roleId');
  }

  async findByUsername(username) {
    return await User.findOne({ username }).populate('roleId');
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findAll() {
    return await User.find({}).populate('roleId').sort({ createdAt: -1 });
  }

  async update(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('roleId');
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
