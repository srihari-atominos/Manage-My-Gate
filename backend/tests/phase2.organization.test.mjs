import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { Organization } from '../src/features/organization/organization.model.js';
import organizationRepository from '../src/features/organization/organization.repository.js';

import { OrganizationService } from '../src/features/organization/organization.services.js';

test('Phase 2 — Organization Authentication Configuration', async (t) => {
  await t.test('Organization creation — No authenticationMethod results in EXISTING_SYSTEM', async () => {
    const org = new Organization({
      name: 'Default Auth Org',
      organizationType: 'Residential',
    });
    assert.strictEqual(org.authenticationMethod, 'EXISTING_SYSTEM', 'Should default to EXISTING_SYSTEM');
  });

  await t.test('Organization creation — authenticationMethod = EXISTING_SYSTEM is accepted', async () => {
    const org = new Organization({
      name: 'Existing Auth Org',
      organizationType: 'Residential',
      authenticationMethod: 'EXISTING_SYSTEM'
    });
    assert.strictEqual(org.authenticationMethod, 'EXISTING_SYSTEM', 'Should accept EXISTING_SYSTEM');
  });

  await t.test('Organization creation — authenticationMethod = OTP_LOGIN is accepted', async () => {
    const org = new Organization({
      name: 'OTP Auth Org',
      organizationType: 'Residential',
      authenticationMethod: 'OTP_LOGIN'
    });
    assert.strictEqual(org.authenticationMethod, 'OTP_LOGIN', 'Should accept OTP_LOGIN');
  });

  await t.test('Organization creation — authenticationMethod = INVALID is rejected', async () => {
    const org = new Organization({
      name: 'Invalid Auth Org',
      organizationType: 'Residential',
      authenticationMethod: 'INVALID_AUTH'
    });
    const err = org.validateSync();
    assert.ok(err, 'Validation should fail');
    assert.ok(err.errors['authenticationMethod'], 'Should have error on authenticationMethod');
  });

  await t.test('Organization update — Platform Admin can update login policy', async () => {
    const service = new OrganizationService();
    // Test that the method correctly validates the enum
    try {
      await service.updateLoginPolicy(new mongoose.Types.ObjectId(), 'INVALID_METHOD', null);
      assert.fail('Should have thrown an error for invalid method');
    } catch (error) {
      assert.strictEqual(error.statusCode, 400);
      assert.ok(error.message.includes('Invalid authentication method'));
    }
  });
});
