// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable Fast Refresh explicitly
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

// Ensure transformer cache is disabled for development
if (process.env.NODE_ENV !== 'production') {
  config.transformer = {
    ...config.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  };
}

module.exports = config;





