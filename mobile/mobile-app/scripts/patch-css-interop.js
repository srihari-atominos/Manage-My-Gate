const fs = require('fs');
const path = require('path');

// 1. Patch react-native-css-interop to prevent circular object stringification crashes
const cssInteropFile = path.resolve(__dirname, '../node_modules/react-native-css-interop/dist/runtime/native/render-component.js');
if (fs.existsSync(cssInteropFile)) {
  let content = fs.readFileSync(cssInteropFile, 'utf8');

  if (content.includes('/* PATCHED_CSS_INTEROP_SAFE_STRINGIFY */')) {
    console.log(`[patch] Already patched: ${cssInteropFile}`);
  } else {
    const needle = 'function printUpgradeWarning(warning, originalProps) {';
    const needleIndex = content.indexOf(needle);
    const replacerNeedle = 'function getDebugReplacer() {';
    const replacerIndex = content.indexOf(replacerNeedle);

    if (needleIndex !== -1 && replacerIndex !== -1) {
      const safeImplementation = `/* PATCHED_CSS_INTEROP_SAFE_STRINGIFY */
function printUpgradeWarning(warning, originalProps) {
    try {
        console.warn('CssInterop upgrade warning: ' + warning);
    } catch (_) {}
}
function stringify(object) {
    try {
        const seen = new WeakSet();
        return JSON.stringify(object, function replace(key, value) {
            if (key === 'children' || key === '_owner' || key === 'navigation' || key === 'route') {
                return '[ReactInternal]';
            }
            if (!(value !== null && typeof value === 'object')) {
                return value;
            }
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
            const newValue = Array.isArray(value) ? [] : {};
            try {
                for (const [k, v] of Object.entries(value)) {
                    try {
                        newValue[k] = replace(k, v);
                    } catch (_) {
                        newValue[k] = '[Unserializable]';
                    }
                }
            } catch (_) {
                return '[Unserializable]';
            }
            seen.delete(value);
            return newValue;
        }, 2);
    } catch (_) {
        return '[Unserializable Props]';
    }
}
`;
      const patched = content.slice(0, needleIndex) + safeImplementation + content.slice(replacerIndex);
      fs.writeFileSync(cssInteropFile, patched, 'utf8');
      console.log(`[patch] Successfully patched ${cssInteropFile}`);
    }
  }
}

// 2. Patch expo-notifications warnOfExpoGoPushUsage to prevent fatal throw in Expo Go on Android
const expoNotifWarnFile = path.resolve(__dirname, '../node_modules/expo-notifications/build/warnOfExpoGoPushUsage.js');
if (fs.existsSync(expoNotifWarnFile)) {
  let content = fs.readFileSync(expoNotifWarnFile, 'utf8');

  if (content.includes('/* PATCHED_EXPO_GO_PUSH_NO_THROW */')) {
    console.log(`[patch] Already patched: ${expoNotifWarnFile}`);
  } else {
    const throwNeedle = "throw new Error(message);";
    if (content.includes(throwNeedle)) {
      const patched = `/* PATCHED_EXPO_GO_PUSH_NO_THROW */\n` + content.replace(
        throwNeedle,
        `console.warn(message); // Patched: downgraded from throw to console.warn for Expo Go dev compatibility`
      );
      fs.writeFileSync(expoNotifWarnFile, patched, 'utf8');
      console.log(`[patch] Successfully patched ${expoNotifWarnFile} (downgraded throw to console.warn)`);
    }
  }
}
