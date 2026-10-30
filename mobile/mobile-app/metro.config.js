const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const os = require('os');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Patch fs and fs.promises against EMFILE on Windows during parallel metro-cache reading bursts
try {
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

const patchPromiseWithRetry = (fn) => {
  if (typeof fn !== 'function') return fn;
  return async function (...args) {
    let delay = 15;
    for (let i = 0; i < 10; i++) {
      try {
        return await fn.apply(this, args);
      } catch (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE') && i < 9) {
          await new Promise((r) => setTimeout(r, delay));
          delay = Math.min(delay * 2, 500);
          continue;
        }
        throw err;
      }
    }
  };
};

if (fs.promises) {
  fs.promises.readFile = patchPromiseWithRetry(fs.promises.readFile);
  fs.promises.writeFile = patchPromiseWithRetry(fs.promises.writeFile);
  if (fs.promises.open) fs.promises.open = patchPromiseWithRetry(fs.promises.open);
  if (fs.promises.stat) fs.promises.stat = patchPromiseWithRetry(fs.promises.stat);
  if (fs.promises.readdir) fs.promises.readdir = patchPromiseWithRetry(fs.promises.readdir);
}

const config = getDefaultConfig(__dirname);

// Limit parallel workers on Windows to prevent EMFILE (too many open files) handle exhaustion
config.maxWorkers = process.platform === 'win32' ? 2 : Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2)));

// Local development proxy to forward /api and /socket.io to backend, eliminating browser CORS blocks
const LOCAL_BACKEND_URL = process.env.EXPO_PUBLIC_LOCAL_BACKEND_URL || 'http://127.0.0.1:5006';
const USE_LOCAL_BACKEND = process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true';
const TARGET_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_PROXY_URL ||
  (USE_LOCAL_BACKEND || (process.env.EXPO_PUBLIC_API_URL &&
  (process.env.EXPO_PUBLIC_API_URL.includes('localhost') ||
    process.env.EXPO_PUBLIC_API_URL.includes('127.0.0.1') ||
    process.env.EXPO_PUBLIC_API_URL.includes(':5006')))
    ? LOCAL_BACKEND_URL
    : (process.env.EXPO_PUBLIC_SOCKET_URL || 'https://managemygate.e3esg.com'));

const localBackend = new URL(LOCAL_BACKEND_URL);
const targetBackend = new URL(TARGET_BACKEND_URL);

function forwardRequest(targetUrl, req, res, bodyBuffer, onFallback) {
  const target = new URL(targetUrl);
  const isHttps = target.protocol === 'https:';
  const client = isHttps ? https : http;

  const proxyHeaders = { ...req.headers };
  delete proxyHeaders['host'];
  delete proxyHeaders['connection'];
  delete proxyHeaders['sec-fetch-dest'];
  delete proxyHeaders['sec-fetch-mode'];
  delete proxyHeaders['sec-fetch-site'];

  proxyHeaders['host'] = target.host;
  proxyHeaders['origin'] = target.origin;
  proxyHeaders['referer'] = target.origin + '/';

  const proxyReq = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      method: req.method,
      path: req.url,
      headers: proxyHeaders,
    },
    (proxyRes) => {
      // If target returned 404, 502, 503, 504 and a fallback handler is provided, retry with fallback
      if ((proxyRes.statusCode === 403 || proxyRes.statusCode === 404 || proxyRes.statusCode >= 502) && typeof onFallback === 'function') {
        proxyRes.resume();
        return onFallback();
      }

      const resHeaders = { ...proxyRes.headers };
      resHeaders['access-control-allow-origin'] = req.headers.origin || '*';
      resHeaders['access-control-allow-credentials'] = 'true';
      resHeaders['access-control-allow-methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      resHeaders['access-control-allow-headers'] = req.headers['access-control-request-headers'] || '*';

      res.writeHead(proxyRes.statusCode, resHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    if (typeof onFallback === 'function') {
      return onFallback();
    }
    console.error(`[Metro Proxy Error] ${req.method} ${req.url} -> ${targetUrl}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Bad Gateway - Metro Proxy Error', error: err.message }));
    }
  });

  if (bodyBuffer && bodyBuffer.length > 0) {
    proxyReq.write(bodyBuffer);
  }
  proxyReq.end();
}

function handleProxy(req, res) {
  // 1. Immediately handle CORS preflight for web development
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    res.end();
    return true;
  }

  const isSocketRequest = req.url && req.url.startsWith('/socket.io/');
  const dispatch = (bodyBuffer) => {
    // For Socket.io polling sessions, never fall back across servers if a session ID (sid) is present,
    // as session IDs are in-memory to a single server instance.
    const hasSid = isSocketRequest && req.url.includes('sid=');
    forwardRequest(LOCAL_BACKEND_URL, req, res, bodyBuffer, hasSid ? null : () => {
      forwardRequest(TARGET_BACKEND_URL, req, res, bodyBuffer);
    });
  };

  if (req.readableEnded) {
    dispatch(null);
  } else {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : null;
      dispatch(bodyBuffer);
    });
  }

  return true;
}

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

      // Forward API and Socket.io requests when in web mode
      if (req.url && (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/'))) {
        return handleProxy(req, res);
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
