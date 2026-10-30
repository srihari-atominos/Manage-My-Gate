import { LogBox } from 'react-native';

const IGNORED_WARNINGS = [
  'Listening to push token changes is not yet fully supported on web',
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  '"shadow*" style props are deprecated. Use "boxShadow"',
  'Unknown event handler property',
  'TouchableMixin is deprecated. Please use Pressable.',
  'Animated: `useNativeDriver` is not supported',
  'Reduced motion setting is enabled on this device',
  '[Reanimated] Reading from `value` during component render',
  '[Reanimated] Writing to `value` during component render',
  'Password field is not contained in a form',
  "The action 'GO_BACK' was not handled by any navigator",
  "The action 'ROUTE_NAMES_CHANGED'",
  'ImageBackground is deprecated and will be removed in a future release',
  'Linking found multiple possible URI schemes in your Expo config',
  '[Reanimated] Dependencies should only be used on the web',
  'ExpoNotificationChannelManager.setNotificationChannelAsync',
  'cannot contain a nested <button>',
  'validateDOMNesting',
  'Download the React DevTools for a better development experience',
  'Added non-passive event listener to a scroll-blocking',
  'Expected static flag was missing',
];

LogBox.ignoreLogs(IGNORED_WARNINGS);

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const fullMessage = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
  if (fullMessage && IGNORED_WARNINGS.some((w) => fullMessage.includes(w))) return;
  originalConsoleWarn(...args);
};

const originalConsoleInfo = console.info;
console.info = (...args) => {
  const fullMessage = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
  if (fullMessage && IGNORED_WARNINGS.some((w) => fullMessage.includes(w))) return;
  originalConsoleInfo(...args);
};

const originalConsoleError = console.error;
console.error = (...args) => {
  const fullMessage = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
  if (fullMessage && IGNORED_WARNINGS.some((w) => fullMessage.includes(w))) return;
  originalConsoleError(...args);
};
