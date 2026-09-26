import { body } from 'express-validator';

export const updateConfigRules = [
  body('email')
    .optional({ checkFalsy: false })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const str = String(value).trim();
      if (str === '') return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(str)) {
        throw new Error('Please provide a valid email address.');
      }
      return true;
    }),
];

export default {
  updateConfigRules,
};
