class EventEmitter {
  addListener() {
    return { remove: jest.fn() };
  }
  removeListener() {}
  emit() {}
  removeAllListeners() {}
}

class SharedObject {}
class SharedRef {}

class NativeRequest extends SharedObject {
  start() {}
  cancel() {}
}

class NativeResponse extends SharedObject {
  startStreaming() {}
  cancelStreaming() {}
  arrayBuffer() {}
  text() {}
}

const ExpoFetchModule = {
  NativeRequest,
  NativeResponse,
};

const requireNativeModule = jest.fn((name) => {
  if (name === 'ExpoFetchModule') return ExpoFetchModule;
  return {};
});

if (typeof globalThis !== 'undefined') {
  globalThis.expo = globalThis.expo || {};
  globalThis.expo.EventEmitter = EventEmitter;
  globalThis.expo.SharedObject = SharedObject;
  globalThis.expo.SharedRef = SharedRef;
  globalThis.expo.NativeModulesProxy = { ExpoFetchModule };
  globalThis.expo.modules = { ExpoFetchModule };
}

module.exports = {
  __esModule: true,
  default: {
    NativeModulesProxy: { ExpoFetchModule },
    EventEmitter,
    SharedObject,
    SharedRef,
    ExpoFetchModule,
    requireNativeModule,
    requireOptionalNativeModule: jest.fn(() => null),
    installExpoGlobalPolyfill: jest.fn(),
  },
  NativeModulesProxy: { ExpoFetchModule },
  EventEmitter,
  SharedObject,
  SharedRef,
  ExpoFetchModule,
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  requireNativeModule,
  requireOptionalNativeModule: jest.fn(() => null),
  installExpoGlobalPolyfill: jest.fn(),
};
