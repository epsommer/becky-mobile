<objective>
Fix the RNGestureHandlerModule native module registration error that occurs when launching the app in the dev server.

Error: `TurboModuleRegistry.getEnforcing(...) 'RNGestureHandlerModule' could not be found. Verify that a module by this name is registered in the native binary.`

This is blocking app testing and development.
</objective>

<context>
- React Native Expo app (Expo SDK 52)
- Uses `react-native-gesture-handler` v2.20.2
- Development build with expo-dev-client
- The error indicates the native module is not properly linked/registered

Examine:
- `./package.json` - current gesture handler version
- `./babel.config.js` - babel plugin configuration
- `./app.json` or `./app.config.js` - Expo configuration
- `./index.ts` or entry point - gesture handler import order
</context>

<diagnosis_steps>
1. Check if `react-native-gesture-handler` is imported at the TOP of the entry point file (before other imports)
2. Verify babel.config.js has the reanimated plugin configured correctly
3. Check for version compatibility between gesture-handler and expo SDK
4. Determine if a native rebuild is needed (prebuild + clean build)
</diagnosis_steps>

<common_fixes>
The most common causes and fixes for this error:

1. **Missing import at entry point**: Add `import 'react-native-gesture-handler';` as the FIRST import in index.ts/App.tsx

2. **Stale native build**: Run `npx expo prebuild --clean` followed by `npx expo run:android` or `npx expo run:ios`

3. **Metro cache**: Clear with `npx expo start --clear`

4. **Version mismatch**: Ensure gesture-handler version is compatible with Expo SDK 52

5. **Babel config**: Ensure `react-native-reanimated/plugin` is in babel.config.js plugins array (must be LAST)
</common_fixes>

<requirements>
1. Identify the specific cause of the RNGestureHandlerModule error
2. Implement the fix with minimal changes
3. Verify the fix resolves the error
4. Document any commands needed to complete the fix (prebuild, cache clear, etc.)
</requirements>

<verification>
After implementing the fix:
1. Clear Metro cache: `npx expo start --clear`
2. If native changes were made: `npx expo prebuild --clean && npx expo run:android`
3. Launch the app and confirm no RNGestureHandlerModule error appears
4. Test basic gesture functionality (scrolling, tapping) to ensure gesture handler works
</verification>

<success_criteria>
- App launches without RNGestureHandlerModule error
- Gesture-based interactions work correctly
- No new errors introduced by the fix
</success_criteria>
