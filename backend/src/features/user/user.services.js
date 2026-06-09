import mongoose from 'mongoose';
import userRepository from './user.repository.js';
import { hashPassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';

export class UserService {
  async getUserById(id, session) {
    const user = await userRepository.findById(id, session);
    if (!user) {
      throw new HttpError(404, `User with ID ${id} not found.`);
    }
    return user;
  }

  async getUserByEmail(email, session) {
    return await userRepository.findByEmail(email, session);
  }

  async getUserByUsername(username, session) {
    return await userRepository.findByUsername(username, session);
  }

  async getUserByEmailOrUsername(emailOrUsername, session) {
    const userByEmail = await userRepository.findByEmail(emailOrUsername, session);
    if (userByEmail) return userByEmail;

    return await userRepository.findByUsername(emailOrUsername, session);
  }

  async createUser(userData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Normalization & Validation
      if (userData.email) userData.email = userData.email.trim().toLowerCase();
      if (userData.username) userData.username = userData.username.trim();

      // Check uniqueness
      const existingEmail = await userRepository.findByEmail(userData.email, session);
      if (existingEmail) {
        throw new HttpError(400, `User with email '${userData.email}' already exists.`);
      }

      const existingUsername = await userRepository.findByUsername(userData.username, session);
      if (existingUsername) {
        throw new HttpError(400, `User with username '${userData.username}' already exists.`);
      }

      // Hash the password securely using crypto utilities
      userData.password = await hashPassword(userData.password);

      const newUser = await userRepository.create(userData, session);
      await session.commitTransaction();
      return newUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getAllUsers(page = 1, limit = 10) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const skip = (page - 1) * limit;
      const { data, totalRecords } = await userRepository.findAllPaginated(skip, limit, session);
      await session.commitTransaction();
      const totalPages = Math.ceil(totalRecords / limit);
      return {
        data,
        pagination: {
          totalRecords,
          currentPage: page,
          totalPages: totalPages || 1,
          limit,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateUser(id, updateData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.getUserById(id, session); // Throws if user doesn't exist
      const updatedUser = await userRepository.update(id, updateData, session);
      await session.commitTransaction();
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteUser(id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.getUserById(id, session); // Throws if user doesn't exist
      const deletedUser = await userRepository.delete(id, session);
      await session.commitTransaction();
      return deletedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async inviteUser(email) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const existing = await userRepository.findByEmail(trimmedEmail, session);
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

      const newUser = await userRepository.create(userData, session);
      await session.commitTransaction();
      return newUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new UserService();
