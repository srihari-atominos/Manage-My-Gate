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
}

export default new UserRepository();
