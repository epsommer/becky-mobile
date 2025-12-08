import { registerRootComponent } from 'expo';

import App from './App';

console.log('[index.ts] ===== ENTRY POINT LOADED =====');
console.log('[index.ts] About to register root component');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
try {
  registerRootComponent(App);
  console.log('[index.ts] Root component registered successfully');
} catch (error) {
  console.error('[index.ts] FATAL ERROR registering component:', error);
  throw error;
}
