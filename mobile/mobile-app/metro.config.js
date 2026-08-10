const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Restrict Metro file watching strictly to the mobile-app directory
// to prevent crawling parent/sibling monorepo directories (backend, frontend, .git)
config.watchFolders = [__dirname];

// Exclude parent/sibling monorepo folders and cache directories from Metro file watcher
config.resolver.blockList = [
  /[/\\]\.(git|expo|idea|vscode)[/\\]/,
  /[/\\](backend|frontend)[/\\]/,
];

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });

