module.exports = function (api) {
  api.cache(true);
  return {
    presets: [[
      'babel-preset-expo',
      { reanimated: false } // disable old reanimated/plugin auto-injection from preset
    ]],
    plugins: [
      ['module-resolver', {
        root: ['.'],
        alias: {
          '@': './',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }],
      'react-native-worklets/plugin',
    ],
  };
};