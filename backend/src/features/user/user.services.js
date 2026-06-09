import userRepository from './user.repository.js';
import { hashPassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';

export class UserService {
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new HttpError(404, `User with ID ${id} not found.`);
    }
    return user;
  }

  async getUserByEmail(email) {
    return await userRepository.findByEmail(email);
  }

  async getUserByUsername(username) {
    return await userRepository.findByUsername(username);
  }

  async getUserByEmailOrUsername(emailOrUsername) {
    const userByEmail = await userRepository.findByEmail(emailOrUsername);
    if (userByEmail) return userByEmail;

    return await userRepository.findByUsername(emailOrUsername);
  }

  async createUser(userData) {
    // Normalization & Validation
    if (userData.email) userData.email = userData.email.trim().toLowerCase();
    if (userData.username) userData.username = userData.username.trim();

    // Check uniqueness
    const existingEmail = await userRepository.findByEmail(userData.email);
    if (existingEmail) {
      throw new HttpError(400, `User with email '${userData.email}' already exists.`);
    }

    const existingUsername = await userRepository.findByUsername(userData.username);
    if (existingUsername) {
      throw new HttpError(400, `User with username '${userData.username}' already exists.`);
    }

    // Hash the password securely using crypto utilities
    userData.password = await hashPassword(userData.password);

    return await userRepository.create(userData);
  }

  async getAllUsers() {
    return await userRepository.findAll();
  }

  async updateUser(id, updateData) {
    await this.getUserById(id); // Throws if user doesn't exist
    return await userRepository.update(id, updateData);
  }

  async deleteUser(id) {
    await this.getUserById(id); // Throws if user doesn't exist
    return await userRepository.delete(id);
  }

  async inviteUser(email) {
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(trimmedEmail);
    if (existing) {
      throw new HttpError(400, `User with email '${trimmedEmail}' already exists.`);
    }

    // Generate a default password
    const hashedPassword = await hashPassword('TemporaryPassword123!');

    const userData = {
      email: trimmedEmail,
      username: trimmedEmail.split('@')[0],
      password: hashedPassword,
    };

    return await userRepository.create(userData);
  }
}

export default new UserService();
