const path = require('path');
const https = require('https');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '.');
const sharedRnRoot = path.resolve(workspaceRoot, 'packages/shared-rn');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

// 4. Force resolution using resolveRequest to guarantee a single instance including subpaths!
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'foodie-shared-rn') {
    return context.resolveRequest(context, sharedRnRoot, platform);
  }

  const dedupedPackages = [
    'react',
    'react-native',
    'react-redux',
    '@react-navigation/native',
    '@react-navigation/native-stack'
  ];

  for (const pkg of dedupedPackages) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      return context.resolveRequest(
        context,
        moduleName.replace(pkg, path.resolve(projectRoot, 'node_modules', pkg)),
        platform
      );
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api/')) {
        const targetHost = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8082';
        const targetUrl = targetHost + req.url;
        const isHttps = targetHost.startsWith('https');
        const httpLib = isHttps ? require('https') : require('http');
        const hostHeader = targetHost.replace(/^https?:\/\//, '');
        const options = {
          method: req.method,
          headers: {
            ...req.headers,
            host: hostHeader,
          },
        };
        const proxyReq = httpLib.request(targetUrl, options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, {
            ...proxyRes.headers,
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          });
          proxyRes.pipe(res, { end: true });
        });
        proxyReq.on('error', (err) => {
          res.writeHead(502, {
            'Content-Type': 'application/json',
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
          });
          res.end(JSON.stringify({ success: false, error: { code: 'BAD_GATEWAY', message: err.message } }));
        });
        req.pipe(proxyReq, { end: true });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
