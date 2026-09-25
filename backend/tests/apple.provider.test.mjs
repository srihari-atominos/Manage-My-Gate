import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import config from '../src/config/config.js';
import appleProvider from '../src/features/userIdentity/providerAdapters/apple.provider.js';
import HttpError from '../src/utils/httpError.utils.js';
import { acceptInviteSsoRules } from '../src/features/auth/auth.validateRules.js';

describe('AppleProvider SSO verification', () => {
  it('uses the native iOS bundle identifier as the default trusted audience', () => {
    assert.equal(config.sso.appleClientId, 'com.atominosconsulting.nahom');
  });

  it('normalizes a first Apple authorization response', () => {
    const identity = appleProvider.normalizeIdentity(
      { sub: 'apple-user-123', email: 'Resident@Privaterelay.AppleID.com' },
      { fullName: 'Asha Nair' }
    );

    assert.deepEqual(identity, {
      provider: 'apple',
      providerId: 'apple-user-123',
      providerEmail: 'resident@privaterelay.appleid.com',
      profileData: { name: 'Asha Nair' },
    });
  });

  it('allows repeat Apple authorizations without an email so the stable subject can be linked', () => {
    const identity = appleProvider.normalizeIdentity({ sub: 'apple-user-123' });
    assert.equal(identity.providerEmail, null);
    assert.equal(identity.providerId, 'apple-user-123');
  });

  it('rejects malformed Apple identity tokens', async () => {
    await assert.rejects(
      () => appleProvider.verifyToken('not-a-jwt'),
      (error) => error instanceof HttpError && error.statusCode === 401
    );
  });

  it('requires an Apple identity token before opening a database transaction', async () => {
    const authService = (await import('../src/features/auth/auth.services.js')).default;
    await assert.rejects(
      () => authService.loginWithApple({}),
      (error) => error instanceof HttpError && error.statusCode === 400
    );
  });

  it('accepts Apple credentials in the invitation SSO validation contract', async () => {
    const req = {
      body: {
        inviteToken: 'invite-token',
        ssoCredential: 'apple-identity-token',
        provider: 'apple',
        nonce: 'request-nonce',
        fullName: 'Asha Nair',
      },
    };

    for (const rule of acceptInviteSsoRules) {
      await rule.run(req);
    }
    assert.equal(validationResult(req).isEmpty(), true);
  });
});
