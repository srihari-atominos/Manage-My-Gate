// Passive event listener helper for web platform
// Resolves Chrome DevTools: "[Violation] Added non-passive event listener to a scroll-blocking 'wheel' event."
// By default in modern DOM, touchstart/touchend are passive, but RNW / GestureHandler registers 'wheel'/'mousewheel'
// without { passive: true } causing Chrome to log continuous scroll-blocking violations.

if (typeof window !== 'undefined' && typeof EventTarget !== 'undefined' && EventTarget.prototype) {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    let opts = options;
    if (type === 'wheel' || type === 'mousewheel') {
      if (typeof options === 'boolean') {
        opts = { capture: options, passive: true };
      } else if (typeof options === 'object' && options !== null) {
        if (options.passive === undefined) {
          opts = { ...options, passive: true };
        }
      } else if (options === undefined) {
        opts = { passive: true };
      }
    }
    return originalAddEventListener.call(this, type, listener, opts);
  };
}
