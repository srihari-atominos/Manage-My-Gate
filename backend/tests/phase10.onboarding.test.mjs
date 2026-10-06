import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/features/user/user.model.js';
import Otp from '../src/features/otp/otp.model.js';

describe('Phase 10 — Onboarding & Authentication Architecture Verification', () => {
  it('should initialize User schema with default credentialStatus and appAccessStatus', () => {
    const newUser = new User({
      email: 'testannouncement@example.com',
      username: 'testannouncement',
      status: 'Active',
    });

    assert.equal(newUser.credentialStatus, 'NOT_INITIALIZED');
    assert.equal(newUser.appAccessStatus, 'NOT_YET_ACCESSED');
    assert.equal(newUser.password, undefined);
  });

  it('should compute credentialStatus as INITIALIZED when password is explicitly provided', () => {
    const userWithPass = new User({
      email: 'adminwithpass@example.com',
      username: 'adminwithpass',
      password: 'hashed_password_string_here',
      status: 'Active',
    });

    assert.equal(userWithPass.credentialStatus, 'INITIALIZED');
  });

  it('should allow purpose-scoped OTP types in Otp model enum', () => {
    const adminEmailOtp = new Otp({
      identifier: 'adminotp@example.com',
      code: 'hashed_code_123',
      type: 'COMMUNITY_ADMIN_EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 15 * 60000),
    });
    assert.equal(adminEmailOtp.type, 'COMMUNITY_ADMIN_EMAIL_VERIFICATION');

    const firstTimeSetupOtp = new Otp({
      identifier: 'firsttime@example.com',
      code: 'hashed_code_456',
      type: 'FIRST_TIME_ACCOUNT_SETUP',
      expiresAt: new Date(Date.now() + 15 * 60000),
    });
    assert.equal(firstTimeSetupOtp.type, 'FIRST_TIME_ACCOUNT_SETUP');
  });
});
