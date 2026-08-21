const ReactTestRenderer = require('react-test-renderer');
if (!ReactTestRenderer.createRoot) {
  ReactTestRenderer.createRoot = function (options) {
    let renderer = null;
    return {
      render(element) {
        if (!renderer) {
          renderer = ReactTestRenderer.create(element, options);
        } else {
          renderer.update(element);
        }
      },
      unmount() {
        if (renderer) {
          renderer.unmount();
          renderer = null;
        }
      },
      get container() {
        if (renderer && renderer.root && !renderer.root.queryAll) {
          renderer.root.queryAll = (predicate) => renderer.root.findAll(predicate);
        }
        return renderer ? renderer.root : null;
      },
      get root() {
        return renderer ? renderer.root : null;
      },
      toJSON() {
        return renderer ? renderer.toJSON() : null;
      },
    };
  };
}

jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  EventEmitter: jest.fn(() => ({ addListener: jest.fn(), removeListener: jest.fn() })),
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  requireNativeModule: jest.fn(),
}), { virtual: true });

jest.mock('react-native-worklets', () => ({
  createSerializable: jest.fn(() => ({ set: jest.fn(), get: jest.fn() })),
  serializableMappingCache: new Map(),
  scheduleOnUI: jest.fn(),
  registerWorklet: jest.fn(),
  loadUnpackers: jest.fn(),
  runOnUI: jest.fn((fn) => fn),
  runOnJS: jest.fn((fn) => fn),
}), { virtual: true });

jest.mock('react-native-reanimated', () => {
  const reanimated = require('react-native-reanimated/mock');
  reanimated.default.call = () => {};
  return {
    ...reanimated,
    useSharedValue: jest.fn((val) => ({ value: val })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
  };
});

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

global.fetch = jest.fn(() => Promise.resolve({
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  ok: true,
  status: 200,
}));

