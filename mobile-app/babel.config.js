module.exports = function(api) {
  // Use filesystem cache only in production
  api.cache(process.env.NODE_ENV === 'production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@utils': './src/utils',
            '@services': './src/services',
            '@constants': './src/constants',
            '@context': './src/context',
            '@types': './src/types',
            '@assets': './assets',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};





