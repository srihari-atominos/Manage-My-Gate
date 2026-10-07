const fs = require('fs');
let content = fs.readFileSync('jest.setup.js', 'utf8');
content = content.replace(/\x00/g, ''); // Fix encoding nulls
content = content.replace(/j e s t \. m o c k .*/g, ''); 
content = content.trim();
content += "\n\njest.mock('expo-router', () => ({ useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn() })), useLocalSearchParams: jest.fn(() => ({})), usePathname: jest.fn(() => ''), Link: 'Link' }));\n";
fs.writeFileSync('jest.setup.js', content, 'utf8');
