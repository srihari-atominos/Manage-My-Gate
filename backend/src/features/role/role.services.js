import mongoose from 'mongoose';
import roleRepository from './role.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class RoleService {
  async getAllRoles(page = 1, limit = 10) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const skip = (page - 1) * limit;
      const { data, totalRecords } = await roleRepository.findAllPaginated(skip, limit, session);
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

  async getRoleById(id, session) {
    const role = await roleRepository.findById(id, session);
    if (!role) {
      throw new HttpError(404, `Role with ID ${id} not found.`);
    }
    return role;
  }

  async getRoleByName(name, session) {
    return await roleRepository.findByName(name, session);
  }

  async createRole(roleData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (roleData.name) {
        roleData.name = roleData.name.trim();
      }
      const existingRole = await roleRepository.findByName(roleData.name, session);
      if (existingRole) {
        throw new HttpError(400, `Role with name '${roleData.name}' already exists.`);
      }
      const newRole = await roleRepository.create(roleData, session);
      await session.commitTransaction();
      return newRole;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateRole(id, updateData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.getRoleById(id, session);
      if (updateData.name) {
        updateData.name = updateData.name.trim();
        const existing = await roleRepository.findByName(updateData.name, session);
        if (existing && existing._id.toString() !== id) {
          throw new HttpError(400, `Role with name '${updateData.name}' already exists.`);
        }
      }
      const updatedRole = await roleRepository.update(id, updateData, session);
      await session.commitTransaction();
      return updatedRole;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteRole(id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.getRoleById(id, session);
      const deletedRole = await roleRepository.delete(id, session);
      await session.commitTransaction();
      return deletedRole;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new RoleService();
