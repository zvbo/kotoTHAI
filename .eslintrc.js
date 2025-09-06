module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    '@react-native-community',
    'plugin:jest/recommended', // Added Jest support
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jest'],
  rules: {
    'prettier/prettier': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ["node_modules/", "dist/", ".expo/", "ios/", "android/", "babel.config.js", "jest.config.js", ".prettierrc.js"],
};