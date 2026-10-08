const fs = require('fs');
fs.appendFileSync('jest.setup.js', "\n\njest.mock('expo-router', () => ({ useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn() })), useLocalSearchParams: jest.fn(() => ({})), usePathname: jest.fn(() => ''), Link: 'Link' }));\n");
