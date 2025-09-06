// In v12.4+, the matchers are built-in and don't need to be imported.
// However, if you need to polyfill other things, this file is the place to do it.
// For example, you might need to mock native modules here.
import '@testing-library/jest-native/extend-expect';

// Silence the warning about act() not being supported in production
jest.spyOn(console, 'warn').mockImplementation((...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning: unstable_flushDiscreteUpdates')) {
    return;
  }
  // Keep original console.warn for other warnings
  // console.warn.apply(console, args);
});
