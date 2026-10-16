import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import permissionRepository from '../../src/features/permission/permission.repository.js';
import Permission from '../../src/features/permission/permission.model.js';

describe('PermissionRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('upsert', () => {
    it('should create a new permission if it does not exist', async () => {
      const p = await permissionRepository.upsert('USER', 'READ');
      
      expect(p).toBeDefined();
      expect(p.feature).toBe('USER');
      expect(p.action).toBe('READ');
      expect(p.name).toBe('USER:READ');
    });

    it('should return existing permission on upsert', async () => {
      const p1 = await permissionRepository.upsert('USER', 'WRITE');
      const p2 = await permissionRepository.upsert('USER', 'WRITE');
      
      expect(p1._id.toString()).toBe(p2._id.toString());
      
      const count = await Permission.countDocuments();
      expect(count).toBe(1);
    });
  });
});
