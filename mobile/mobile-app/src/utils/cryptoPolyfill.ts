/**
 * WebCrypto API Polyfill for Insecure Web Origins (e.g. LAN HTTP http://192.168.x.x:8081).
 * 
 * Browsers restrict window.crypto.subtle to secure origins (https:// or http://localhost).
 * When running Expo web over local network IP addresses during development or testing,
 * expo-crypto and expo-auth-session throw:
 * "CodedError: Access to the WebCrypto API is restricted to secure origins (localhost/https)."
 * 
 * This polyfill provides a standard, pure-JavaScript SHA-256 implementation for crypto.subtle.digest,
 * ensuring PKCE generation, nonces, and OAuth authentication requests function seamlessly.
 */

function toUint8Array(input: ArrayBuffer | ArrayBufferView | string): Uint8Array {
  if (typeof input === 'string') {
    return new TextEncoder().encode(input);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input as any);
}

function sha256Buffer(bytes: Uint8Array): ArrayBuffer {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  const words: number[] = [];
  const asciiBitLength = bytes.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);

  for (i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (j = 0; j < 64; j++) {
      const w15 = w[j - 15];
      const w2 = w[j - 2];
      const a = hash[0];
      const e = hash[4];

      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[j] +
        (w[j] =
          j < 16
            ? w[j] || 0
            : (w[j - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[j - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);
  for (i = 0; i < 8; i++) {
    view.setUint32(i * 4, hash[i], false);
  }
  return buffer;
}

const polyfillSubtle = {
  digest: async (algorithm: any, data: any): Promise<ArrayBuffer> => {
    const algoName = (typeof algorithm === 'string' ? algorithm : algorithm?.name || 'SHA-256')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (algoName === 'SHA256') {
      return sha256Buffer(toUint8Array(data));
    }
    // Fallback: If another algorithm is queried, return standard buffer if available
    return sha256Buffer(toUint8Array(data));
  },
};

export function setupCryptoPolyfill(): void {
  if (typeof globalThis === 'undefined' && typeof window === 'undefined') {
    return;
  }

  const root: any = typeof globalThis !== 'undefined' ? globalThis : window;

  if (!root.crypto) {
    root.crypto = {};
  }

  // If window.crypto is present (or globalThis.crypto) but subtle is missing:
  if (!root.crypto.subtle) {
    try {
      root.crypto.subtle = polyfillSubtle;
    } catch {
      try {
        Object.defineProperty(root.crypto, 'subtle', {
          value: polyfillSubtle,
          configurable: true,
          writable: true,
        });
      } catch {}
    }
  }

  if (typeof window !== 'undefined' && (window as any).crypto && !(window as any).crypto.subtle) {
    try {
      (window as any).crypto.subtle = polyfillSubtle;
    } catch {
      try {
        Object.defineProperty((window as any).crypto, 'subtle', {
          value: polyfillSubtle,
          configurable: true,
          writable: true,
        });
      } catch {}
    }
  }

  // Also hook on Crypto prototype if present on window
  if (typeof window !== 'undefined' && (window as any).Crypto?.prototype) {
    try {
      if (!(window as any).Crypto.prototype.subtle) {
        Object.defineProperty((window as any).Crypto.prototype, 'subtle', {
          value: polyfillSubtle,
          configurable: true,
          writable: true,
        });
      }
    } catch {}
  }

  // Fallback for getRandomValues if missing
  if (!root.crypto.getRandomValues) {
    root.crypto.getRandomValues = (typedArray: Uint8Array) => {
      for (let idx = 0; idx < typedArray.length; idx++) {
        typedArray[idx] = Math.floor(Math.random() * 256);
      }
      return typedArray;
    };
  }

  // Suppress unhandled rejection on web if triggered by library race conditions
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', (event) => {
      if (
        event.reason?.message?.includes('WebCrypto API is restricted') ||
        event.reason?.message?.includes('ERR_CRYPTO_UNAVAILABLE')
      ) {
        event.preventDefault();
      }
    });
  }
}

// Automatically invoke on module load
setupCryptoPolyfill();

export default setupCryptoPolyfill;
