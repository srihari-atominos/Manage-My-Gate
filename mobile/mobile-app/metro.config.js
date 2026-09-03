const fs = require('fs');
const gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(fs);

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const os = require('os');

const config = getDefaultConfig(__dirname);

// Limit parallel workers on Windows to prevent EMFILE (too many open files) handle exhaustion
config.maxWorkers = Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2)));


module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });

