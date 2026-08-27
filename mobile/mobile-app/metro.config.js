const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const os = require('os');

const config = getDefaultConfig(__dirname);

// Limit parallel workers on Windows to prevent EMFILE (too many open files) handle exhaustion
config.maxWorkers = Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2)));

// Exclude non-source & cached directories from Metro resolver & watcher
config.resolver.blockList = [
  /node_modules\/.*\/node_modules/,
  /\.git\/.*/,
  /\.expo\/.*/,
];

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
