<objective>
Build debug and release APKs for the becky-mobile application and create a comprehensive testing guide for deploying to actual Android devices.

This prompt handles the complete workflow from prebuild to APK generation to device testing.
</objective>

<context>
Project: becky-mobile (Expo SDK 52, React Native 0.76)
Location: ~/projects/apps/becky-mobile

Prerequisites to verify:
!java -version
!echo $ANDROID_HOME
!ls $ANDROID_HOME/build-tools/ 2>/dev/null | tail -1
!adb devices

Check app configuration:
@app.json or @app.config.js
@eas.json (if exists)
</context>

<requirements>

<phase_1_environment_setup>
1. **Verify Android Development Environment**
   - Java/JDK installed (Java 17 recommended for RN 0.76)
   - Android SDK installed with build-tools
   - ANDROID_HOME environment variable set
   - Platform tools in PATH (adb accessible)

2. **Verify Project Configuration**
   - Check app.json has valid android configuration
   - Verify package name (android.package)
   - Check version and versionCode

3. **Install Dependencies**
   !yarn install
   !npx expo-doctor
</phase_1_environment_setup>

<phase_2_debug_build>
1. **Generate Android Project**
   !npx expo prebuild --platform android --clean

2. **Build Debug APK**
   !cd android && ./gradlew assembleDebug

3. **Locate Debug APK**
   APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Verify Debug Build**
   - Check APK size
   - Verify it's not signed with release key
</phase_2_debug_build>

<phase_3_release_build>
1. **Keystore Setup**
   If no keystore exists, create one:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore android/app/release.keystore -alias becky-release -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing**
   Update `android/app/build.gradle` with signing config:
   ```gradle
   signingConfigs {
       release {
           storeFile file('release.keystore')
           storePassword System.getenv("KEYSTORE_PASSWORD") ?: 'your-password'
           keyAlias 'becky-release'
           keyPassword System.getenv("KEY_PASSWORD") ?: 'your-password'
       }
   }
   ```

3. **Build Release APK**
   !cd android && ./gradlew assembleRelease

4. **Locate Release APK**
   APK location: `android/app/build/outputs/apk/release/app-release.apk`

5. **Verify Release Build**
   - Check APK is signed
   - Verify smaller size than debug (proguard/minification)
   !cd android && ./gradlew signingReport
</phase_3_release_build>

<phase_4_device_testing>
1. **Connect Device**
   - Enable Developer Options on Android device
   - Enable USB Debugging
   - Connect via USB
   - Verify: `adb devices` shows device

2. **Install Debug APK**
   !adb install android/app/build/outputs/apk/debug/app-debug.apk

3. **Install Release APK**
   !adb install android/app/build/outputs/apk/release/app-release.apk

4. **Alternative: Generate QR for sharing**
   - Use EAS Build for cloud builds if local fails
   - Share APK via local network or cloud storage

5. **Testing Checklist**
   - App launches without crash
   - Authentication flow works
   - API calls succeed
   - Push notifications received
   - Offline functionality works
   - All screens accessible
   - Performance acceptable
</phase_4_device_testing>

</requirements>

<troubleshooting>
Common issues and solutions:

1. **Gradle build fails with memory error**
   - Add to gradle.properties: `org.gradle.jvmargs=-Xmx4096m`

2. **SDK version mismatch**
   - Check compileSdkVersion in build.gradle matches installed SDK

3. **Keystore issues**
   - Verify keystore path is correct
   - Check alias name matches

4. **ADB device not found**
   - Try different USB cable/port
   - Revoke USB debugging authorizations and reauthorize

5. **App crashes on launch**
   - Check `adb logcat | grep -i "becky"` for crash logs
   - Verify all native dependencies are properly linked
</troubleshooting>

<output_format>
Create a testing guide document with:

1. **Environment Setup Verification**
   - Status of each prerequisite
   - Any issues encountered and resolutions

2. **Build Results**
   - Debug APK: path, size, build time
   - Release APK: path, size, build time, signing status

3. **Device Installation Commands**
   - Ready-to-run commands for both APKs

4. **Testing Checklist**
   - Detailed testing steps for QA
   - Expected behavior for each feature

5. **Known Issues**
   - Any issues discovered during build/test
   - Workarounds if applicable

Save guide to: `./docs/apk-build-testing-guide.md`
Copy APKs to: `./builds/` directory for easy access
</output_format>

<verification>
Before completing, verify:
- Both debug and release APKs generated successfully
- APK files exist at expected locations
- At least one APK tested on actual device
- Testing checklist is comprehensive
- Troubleshooting section covers encountered issues
- Guide enables someone else to repeat the process
</verification>
