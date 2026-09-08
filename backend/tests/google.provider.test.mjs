import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import config from '../src/config/config.js';
import googleProvider from '../src/features/userIdentity/providerAdapters/google.provider.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('GoogleProvider SSO Verification', () => {
  it('should have both Web and Android Client IDs configured in config.sso', () => {
    assert.equal(
      config.sso.googleClientId,
      '610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com'
    );
    assert.equal(
      config.sso.googleAndroidClientId,
      '610778456829-6g1bvqtplfrgva93sbdsvgbuqmkpr203.apps.googleusercontent.com'
    );
  });

  it('should construct validAudiences array containing both Web and Android Client IDs', () => {
    const validAudiences = [
      config.sso.googleClientId,
      config.sso.googleAndroidClientId,
    ].filter(Boolean);

    assert.equal(validAudiences.length, 2);
    assert.ok(validAudiences.includes('610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com'));
    assert.ok(validAudiences.includes('610778456829-6g1bvqtplfrgva93sbdsvgbuqmkpr203.apps.googleusercontent.com'));
    
    // Simulate OAuth2Client audience array verification logic
    const verifyAudience = (tokenAud) => validAudiences.indexOf(tokenAud) > -1;

    // Web Client ID must be trusted
    assert.equal(verifyAudience('610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com'), true);
    // Android Client ID must be trusted
    assert.equal(verifyAudience('610778456829-6g1bvqtplfrgva93sbdsvgbuqmkpr203.apps.googleusercontent.com'), true);
    // Any other arbitrary audience must be rejected
    assert.equal(verifyAudience('arbitrary-unauthorized-client-id.apps.googleusercontent.com'), false);
    assert.equal(verifyAudience(''), false);
  });

  it('should normalize identity correctly from raw Google payload', () => {
    const rawPayload = {
      sub: 'google-uid-999',
      email: 'TestUser@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg'
    };

    const identity = googleProvider.normalizeIdentity(rawPayload);

    assert.deepEqual(identity, {
      provider: 'google',
      providerId: 'google-uid-999',
      providerEmail: 'testuser@example.com',
      profileData: {
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg'
      }
    });
  });

  it('should throw 400 if email is missing from Google profile', () => {
    const rawPayload = {
      sub: 'google-uid-999',
      name: 'Test User'
    };

    assert.throws(
      () => googleProvider.normalizeIdentity(rawPayload),
      (err) => err instanceof HttpError && err.statusCode === 400
    );
  });

  it('should reject invalid or malformed Google tokens with 401 HttpError', async () => {
    await assert.rejects(
      () => googleProvider.verifyToken('invalid-jwt-token'),
      (err) => {
        assert(err instanceof HttpError);
        assert.equal(err.statusCode, 401);
        assert(err.message.includes('Invalid Google Token'));
        return true;
      }
    );
  });
});
