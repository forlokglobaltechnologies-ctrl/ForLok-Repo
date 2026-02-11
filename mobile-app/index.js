// CRITICAL: Set environment variable BEFORE any imports
// This prevents expo-updates native module from initializing
process.env.EXPO_NO_UPDATES = '1';
if (typeof global !== 'undefined') {
  global.__EXPO_UPDATES_DISABLED__ = true;
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);





