import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import userIdentityService from '../src/features/userIdentity/userIdentity.services.js';
import userService from '../src/features/user/user.service.js';
import sessionService from '../src/features/session/session.service.js';
import { signToken } from '../src/utils/jwt.utils.js';

// Mock the services that communicate with external APIs or DB directly
jest.mock('../src/features/userIdentity/userIdentity.services.js');
jest.mock('../src/features/session/session.service.js');
jest.mock('../src/features/user/user.service.js');

describe('Auth Feature Integration Tests', () => {
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock startSession return payload with spies
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('SSO Authentication flow - First-time Login', () => {
    it('should successfully log in via SSO for first-time user without active workspaces', async () => {
      const mockIdentityData = {
        providerEmail: 'firsttime@example.com',
        provider: 'google',
        providerId: 'google-id-123',
        profileData: { name: 'First Time User' },
      };

      // Mock user not existing, then registering
      userIdentityService.verifyAndNormalizeProviderToken.mockResolvedValue(mockIdentityData);
      userIdentityService.getIdentityByProviderId.mockResolvedValue(null);
      userService.getUserByEmail.mockResolvedValue(null);
      
      const mockNewUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'firsttime@example.com',
        username: 'firsttime',
        status: 'Active',
      };
      userService.createUser.mockResolvedValue(mockNewUser);
      userIdentityService.linkIdentity.mockResolvedValue(true);

      // Mock session service
      sessionService.createSession.mockResolvedValue('mock-refresh-token');

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'mock-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availableWorkspaces).toEqual([]);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('Mongoose Transaction Rollback', () => {
    it('should abort and roll back transaction when session creation throws an error', async () => {
      const mockIdentityData = {
        providerEmail: 'rollback@example.com',
        provider: 'google',
        providerId: 'google-id-456',
        profileData: { name: 'Rollback User' },
      };

      userIdentityService.verifyAndNormalizeProviderToken.mockResolvedValue(mockIdentityData);
      userIdentityService.getIdentityByProviderId.mockResolvedValue(null);
      userService.getUserByEmail.mockResolvedValue(null);

      const mockNewUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'rollback@example.com',
        username: 'rollback',
        status: 'Active',
      };
      userService.createUser.mockResolvedValue(mockNewUser);
      userIdentityService.linkIdentity.mockResolvedValue(true);

      // Force sessionService.createSession to throw an error inside transaction
      sessionService.createSession.mockRejectedValue(new Error('Session Database Write Failure'));

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'mock-google-token' });

      expect(res.status).toBe(500); // errorHandler handles thrown exception
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/accept-invite/sso', () => {
    it('should throw 403 error if the provider email does not match the invited email', async () => {
      // 1. Generate invitation token for invited@example.com
      const invitedEmail = 'invited@example.com';
      const inviteToken = signToken({ email: invitedEmail, id: 'user-id-789' });

      // 2. Mock SSO provider verification to return a DIFFERENT email address
      const mockSsoIdentity = {
        providerEmail: 'different@example.com',
        provider: 'google',
        providerId: 'google-id-789',
      };
      userIdentityService.verifyAndNormalizeProviderToken.mockResolvedValue(mockSsoIdentity);

      // 3. Request accept-invite/sso with mismatched email
      const res = await request(app)
        .post('/api/auth/accept-invite/sso')
        .send({
          inviteToken,
          ssoCredential: 'mock-sso-cred',
          provider: 'google',
        });

      // 4. Assert 403 Forbidden is thrown
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Email in SSO token does not match the invitation email.');
    });
  });
});
