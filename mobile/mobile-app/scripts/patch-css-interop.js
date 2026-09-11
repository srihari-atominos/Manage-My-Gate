const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve(__dirname, '../node_modules/react-native-css-interop/dist/runtime/native/render-component.js'),
];

for (const targetFile of targetFiles) {
  if (!fs.existsSync(targetFile)) {
    console.log(`[patch-css-interop] File not found: ${targetFile}, skipping.`);
    continue;
  }

  let content = fs.readFileSync(targetFile, 'utf8');

  if (content.includes('/* PATCHED_CSS_INTEROP_SAFE_STRINGIFY */')) {
    console.log(`[patch-css-interop] Already patched: ${targetFile}`);
    continue;
  }

  const needle = 'function printUpgradeWarning(warning, originalProps) {';
  const needleIndex = content.indexOf(needle);
  if (needleIndex === -1) {
    console.warn(`[patch-css-interop] Could not locate printUpgradeWarning in ${targetFile}`);
    continue;
  }

  // Find where getDebugReplacer begins
  const replacerNeedle = 'function getDebugReplacer() {';
  const replacerIndex = content.indexOf(replacerNeedle);
  if (replacerIndex === -1) {
    console.warn(`[patch-css-interop] Could not locate getDebugReplacer in ${targetFile}`);
    continue;
  }

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
  fs.writeFileSync(targetFile, patched, 'utf8');
  console.log(`[patch-css-interop] Successfully patched ${targetFile}`);
}
