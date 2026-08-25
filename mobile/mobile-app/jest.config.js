module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^expo-modules-core(.*)$': '<rootDir>/jest.expo-modules-mock.js',
    '^test-renderer$': 'react-test-renderer',
    '^immer$': '<rootDir>/node_modules/immer/dist/cjs/index.js',
    '^react-native/setup-env$': '<rootDir>/jest.react-native-setup.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|nativewind|@gorhom/bottom-sheet|@rn-primitives|immer|@reduxjs/toolkit)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'src/features/visitor/**/*.{ts,tsx}',
    '!src/features/visitor/mocks/**',
  ],
};
