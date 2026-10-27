export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '<rootDir>/tests/features/**/*.test.js',
    '<rootDir>/tests/features/**/*.test.mjs',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/features/communityEngagement/',
    '/tests/features/e2e/',
    '/tests/features/noticeBoard/',
    '/tests/features/outbox/',
    '/tests/features/poll/',
    '/tests/features/rbac/',
    '/tests/features/scheduler/',
    '/tests/features/expense\\.',
    '/tests/features/expenseOcr\\.',
    '/tests/features/personalExpense\\.',
  ],
  testTimeout: 60000,
  verbose: true,
};
