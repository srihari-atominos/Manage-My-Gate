const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.jest.transformIgnorePatterns = [
  "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|@testing-library/.*|@rn-primitives/.*|immer|react-redux|@reduxjs/toolkit|expo-router|standard-navigation)"
];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
