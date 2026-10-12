import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAppLogoUrl, getEmailLogoHtml } from '../src/utils/email.utils.js';

describe('Email App Logo URL Resolution', () => {
  const originalEnv = { ...process.env };

  it('safely falls back to public production domain when CLIENT_URL is localhost', () => {
    delete process.env.APP_LOGO_URL;
    delete process.env.PUBLIC_APP_URL;
    process.env.CLIENT_URL = 'http://localhost:3004';

    const logoUrl = getAppLogoUrl();
    assert.strictEqual(logoUrl, 'https://managemygate.e3esg.com/nahom_full_logo.png');
    assert.ok(!logoUrl.includes('localhost'), 'Logo URL must never be localhost in emails');
  });

  it('uses APP_LOGO_URL when explicitly configured with a public URL', () => {
    process.env.APP_LOGO_URL = 'https://cdn.example.com/branding/logo.png';
    const logoUrl = getAppLogoUrl();
    assert.strictEqual(logoUrl, 'https://cdn.example.com/branding/logo.png');
    delete process.env.APP_LOGO_URL;
  });

  it('ignores APP_LOGO_URL if configured as localhost', () => {
    process.env.APP_LOGO_URL = 'http://localhost:5000/logo.png';
    process.env.CLIENT_URL = 'http://localhost:3004';
    const logoUrl = getAppLogoUrl();
    assert.strictEqual(logoUrl, 'https://managemygate.e3esg.com/nahom_full_logo.png');
    delete process.env.APP_LOGO_URL;
  });

  it('renders clean HTML markup with alt text and dimensions', () => {
    delete process.env.APP_LOGO_URL;
    process.env.CLIENT_URL = 'https://custom-community.com';

    const html = getEmailLogoHtml();
    assert.ok(html.includes('<img src="https://custom-community.com/nahom_full_logo.png"'));
    assert.ok(html.includes('alt="Nahom Logo"'));
    assert.ok(!html.includes('onerror'), 'Must not have inline JS onerror in email HTML');
    assert.ok(html.includes('max-height: 45px'));

    // restore
    Object.keys(process.env).forEach((k) => {
      if (!(k in originalEnv)) delete process.env[k];
      else process.env[k] = originalEnv[k];
    });
  });
});
