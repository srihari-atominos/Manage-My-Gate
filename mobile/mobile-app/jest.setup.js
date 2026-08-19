// Global Mocks for Jest environment
require('react-native-reanimated/mock');

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'http://localhost:5002/api/v1',
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('mock-secure-token'),
  setItemAsync: jest.fn().mockResolvedValue(true),
  deleteItemAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('burnt', () => ({
  toast: jest.fn(),
  alert: jest.fn(),
}));

jest.mock('lucide-react-native', () => {
  const MockIcon = () => null;
  return new Proxy({}, { get: () => MockIcon });
});
