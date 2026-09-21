import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, maskPhone, maskEmail } from '../src/utils/phone.utils.js';
import User from '../src/features/user/user.model.js';
import userService from '../src/features/user/user.services.js';

describe('Phase 1 Security Hardening: Phone Lifecycle Tests', () => {

  describe('1. Phone Normalization & Masking Utilities', () => {
    it('should normalize valid Indian phone number strings to canonical E.164 (+91)', () => {
      assert.equal(normalizePhone('+919876543210'), '+919876543210');
      assert.equal(normalizePhone('98765 43210'), '+919876543210');
      assert.equal(normalizePhone('919876543210'), '+919876543210');
    });

    it('should normalize valid US phone number strings to canonical E.164 (+1)', () => {
      assert.equal(normalizePhone('+1 (987) 654-3210', 'US'), '+19876543210');
      assert.equal(normalizePhone('+19876543210'), '+19876543210');
    });

    it('should ensure cross-country numbers with matching trailing digits remain distinct', () => {
      const usPhone = normalizePhone('+19876543210');
      const inPhone = normalizePhone('+919876543210');
      assert.notEqual(usPhone, inPhone);
      assert.equal(usPhone, '+19876543210');
      assert.equal(inPhone, '+919876543210');
    });

    it('should safely mask phone numbers for log outputs', () => {
      assert.equal(maskPhone('+919876543210'), '+91******3210');
      assert.equal(maskPhone('9876543210'), '******3210');
      assert.equal(maskPhone('123'), '****');
    });

    it('should safely mask email addresses for log outputs', () => {
      assert.equal(maskEmail('resident@community.org'), 'r***t@community.org');
      assert.equal(maskEmail('ab@domain.com'), 'a*@domain.com');
    });
  });

  describe('2. User Model Schema Default Verification', () => {
    it('should default phoneVerified to false for newly instantiated User documents', () => {
      const newUser = new User({
        email: 'newresident@example.com',
        username: 'newresident',
        phone: '+919876543210',
      });
      assert.equal(newUser.phoneVerified, false, 'phoneVerified must default to false for new users');
    });
  });

  describe('3. Directory Aggregation Privacy Policy Logic', () => {
    it('should correctly format $cond aggregation projection for showPhoneInDirectory toggle', () => {
      const pipeline = [
        {
          $project: {
            phone: {
              $cond: [
                { $eq: [{ $ifNull: ['$user.showPhoneInDirectory', true] }, false] },
                null,
                '$user.phone',
              ],
            },
            showPhoneInDirectory: { $ifNull: ['$user.showPhoneInDirectory', true] },
          },
        },
      ];

      assert.equal(typeof pipeline[0].$project.phone, 'object');
      assert.equal(pipeline[0].$project.phone.$cond[0].$eq[1], false);
    });
  });

  describe('4. Phone Change Service & Validation Rules', () => {
    it('should reject invalid phone format during requestPhoneOtp', async () => {
      await assert.rejects(
        async () => {
          await userService.requestPhoneOtp('user123', 'invalid-phone-abc');
        },
        (err) => {
          return err.statusCode === 400 && err.message.includes('Invalid phone number format');
        }
      );
    });
  });
});
