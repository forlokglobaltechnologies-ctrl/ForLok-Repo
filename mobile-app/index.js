// CRITICAL: Set environment variable BEFORE any imports
// This prevents expo-updates native module from initializing
process.env.EXPO_NO_UPDATES = '1';
if (typeof global !== 'undefined') {
  global.__EXPO_UPDATES_DISABLED__ = true;
}
// #region agent log
fetch('http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H4',location:'index.js:startup',message:'Index bootstrap executed',data:{updatesDisabled:process.env.EXPO_NO_UPDATES === '1'},timestamp:Date.now()})}).catch(()=>{});
// #endregion

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);





