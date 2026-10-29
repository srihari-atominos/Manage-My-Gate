const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const os = require('os');
const https = require('https');
const http = require('http');

const config = getDefaultConfig(__dirname);

// Limit parallel workers on Windows to prevent EMFILE (too many open files) handle exhaustion
config.maxWorkers = Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2)));

// Local development proxy to forward /api and /socket.io to remote backend, eliminating browser CORS blocks
const TARGET_BACKEND_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://managemygate.e3esg.com';
const targetBackend = new URL(TARGET_BACKEND_URL);
const isTargetHttps = targetBackend.protocol === 'https:';
const proxyClient = isTargetHttps ? https : http;

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

  // 2. Clone and sanitize headers for remote backend forwarding
  const proxyHeaders = { ...req.headers };
  delete proxyHeaders['host'];
  delete proxyHeaders['connection'];
  delete proxyHeaders['sec-fetch-dest'];
  delete proxyHeaders['sec-fetch-mode'];
  delete proxyHeaders['sec-fetch-site'];

  proxyHeaders['host'] = targetBackend.host;
  proxyHeaders['origin'] = targetBackend.origin;
  proxyHeaders['referer'] = targetBackend.origin + '/';

  const proxyReq = proxyClient.request(
    {
      protocol: targetBackend.protocol,
      hostname: targetBackend.hostname,
      port: targetBackend.port || (isTargetHttps ? 443 : 80),
      method: req.method,
      path: req.url,
      headers: proxyHeaders,
    },
    (proxyRes) => {
      // Set permissive CORS response headers so browser accepts the proxied response
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
    console.error(`[Metro Proxy Error] ${req.method} ${req.url}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Bad Gateway - Metro Proxy Error', error: err.message }));
    }
  });

  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end();
  } else {
    req.pipe(proxyReq);
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
