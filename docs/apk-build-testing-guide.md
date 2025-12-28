# Becky CRM - APK Build and Testing Guide

## Overview

This guide provides comprehensive instructions for building, deploying, and testing the Becky CRM Android application on actual devices.

**Application Details:**
- **App Name:** Becky CRM
- **Package Name:** com.epsommer.beckycrm
- **Version:** 1.1.3
- **Version Code:** 20
- **Expo SDK:** 52.0.0
- **React Native:** 0.76.9

---

## Build Environment

### Verified Environment Configuration

| Component | Version/Value |
|-----------|---------------|
| Java | OpenJDK 22.0.1 |
| Android SDK | /Users/epsommer/Library/Android/sdk |
| Build Tools | 34.0.0, 35.0.0, 36.0.0, 36.1.0 |
| Platform | android-35, android-36 |
| ADB | 36.0.0 |
| Node.js | LTS recommended |
| Yarn | 1.22.22 |

### Environment Variables Required

```bash
export ANDROID_HOME=/Users/epsommer/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0
```

---

## Build Results

### Release APK (Production)

| Property | Value |
|----------|-------|
| **Location** | `./builds/becky-crm-v1.1.3-release.apk` |
| **Size** | 63 MB |
| **Signing** | APK Signature Scheme v2 |
| **Build Time** | ~14 minutes |
| **Keystore** | `android/app/release.keystore` |
| **Key Alias** | becky-release |

### Debug APK (Development)

To build a debug APK for development testing:

```bash
# Generate Android project
npx expo prebuild --platform android --clean

# Build debug APK
cd android && ./gradlew assembleDebug

# APK Location: android/app/build/outputs/apk/debug/app-debug.apk
```

**Note:** Debug APK includes development tools and is typically larger (~130 MB).

---

## Device Installation

### Prerequisites

1. Enable USB Debugging on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

2. Connect your device via USB cable

3. Verify device connection:
   ```bash
   adb devices
   ```
   Expected output:
   ```
   List of devices attached
   <device_id>    device
   ```

### Installation Commands

#### Install Release APK
```bash
# Standard installation
adb install ./builds/becky-crm-v1.1.3-release.apk

# Replace existing installation
adb install -r ./builds/becky-crm-v1.1.3-release.apk

# Install to specific device (when multiple connected)
adb -s <device_id> install ./builds/becky-crm-v1.1.3-release.apk
```

#### Install Debug APK
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Wireless Installation (Optional)

```bash
# Connect device via USB first, then:
adb tcpip 5555
adb connect <device_ip>:5555

# Disconnect USB and install wirelessly
adb install ./builds/becky-crm-v1.1.3-release.apk
```

### Uninstall Application
```bash
adb uninstall com.epsommer.beckycrm
```

---

## Testing Checklist

### 1. App Launch and Initialization

- [ ] App launches without crashing
- [ ] Splash screen displays correctly
- [ ] App icon appears in launcher with correct branding
- [ ] Initial loading completes within reasonable time (< 5 seconds)

### 2. Authentication Flow

- [ ] Login screen displays correctly
- [ ] User can enter credentials
- [ ] Login request completes successfully
- [ ] Error messages display for invalid credentials
- [ ] Session persistence works after app restart
- [ ] Logout functionality works correctly

### 3. API Integration

- [ ] Backend API connection established (https://www.evangelosommer.com)
- [ ] Data loads correctly from server
- [ ] Network error handling works properly
- [ ] Offline/online state transitions handled gracefully

### 4. Core Features

#### Contacts Module
- [ ] Contact list loads and displays
- [ ] Contact search functionality works
- [ ] Contact details view accessible
- [ ] Add/Edit/Delete contacts (if applicable)

#### Calendar Module
- [ ] Calendar view renders correctly
- [ ] Events display properly
- [ ] Date navigation works
- [ ] Event creation/editing (if applicable)

#### Analytics/Dashboard
- [ ] Charts render correctly
- [ ] Data refreshes properly
- [ ] Filtering/sorting works

### 5. Push Notifications

- [ ] App requests notification permission
- [ ] Notifications received when app is in background
- [ ] Notifications received when app is in foreground
- [ ] Notification tap opens correct screen

### 6. Offline Functionality

- [ ] App handles airplane mode gracefully
- [ ] Cached data displays when offline
- [ ] Sync resumes when connectivity restored
- [ ] Error messages are user-friendly

### 7. Performance Testing

- [ ] App startup time acceptable (< 3 seconds)
- [ ] Scrolling is smooth (60fps)
- [ ] Memory usage stays reasonable
- [ ] No excessive battery drain
- [ ] No excessive network requests

### 8. UI/UX Testing

- [ ] All screens accessible via navigation
- [ ] Buttons and touch targets responsive
- [ ] Text is readable at all screen sizes
- [ ] Orientation changes handled (if supported)
- [ ] Keyboard shows/hides appropriately
- [ ] Form inputs work correctly

### 9. Device Permissions

Test that the app correctly requests and uses:
- [ ] READ_CONTACTS
- [ ] READ_SMS
- [ ] READ_CALENDAR
- [ ] WRITE_CALENDAR
- [ ] GET_ACCOUNTS
- [ ] WAKE_LOCK
- [ ] RECEIVE_BOOT_COMPLETED

### 10. Edge Cases

- [ ] App handles back button correctly
- [ ] App resumes correctly after being backgrounded
- [ ] App handles being killed and restarted
- [ ] Deep links work correctly (beckycrm://)

---

## Troubleshooting

### Build Issues

#### Out of Memory Error
Add to `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

#### SDK Version Mismatch
Ensure compileSdkVersion matches installed SDK:
```bash
ls $ANDROID_HOME/platforms/
```

#### Dependency Version Issues
Run expo doctor and fix issues:
```bash
npx expo-doctor
npx expo install --fix
```

#### Clean Build
```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --platform android --clean
```

### Device Issues

#### Device Not Detected
1. Try a different USB cable (data cable, not charge-only)
2. Try a different USB port
3. Revoke USB debugging authorization and reauthorize:
   - Settings > Developer Options > Revoke USB debugging authorizations
4. Restart adb:
   ```bash
   adb kill-server
   adb start-server
   ```

#### Installation Fails
```bash
# Check for existing installation
adb shell pm list packages | grep beckycrm

# Force reinstall
adb install -r -d ./builds/becky-crm-v1.1.3-release.apk
```

#### App Crashes on Launch
Check logs:
```bash
adb logcat | grep -i "beckycrm\|ReactNative\|expo"
```

### Signing Issues

#### Verify APK Signature
```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose ./builds/becky-crm-v1.1.3-release.apk
```

#### Keystore Information
```bash
keytool -list -v -keystore android/app/release.keystore
```

---

## Keystore Management

### Release Keystore Details

| Property | Value |
|----------|-------|
| Location | `android/app/release.keystore` |
| Store Password | beckycrm2024 |
| Key Alias | becky-release |
| Key Password | beckycrm2024 |
| Validity | 10,000 days |
| Algorithm | RSA 2048-bit |

**IMPORTANT:**
- Keep the keystore file safe and backed up
- Never commit keystore passwords to version control
- Same keystore must be used for all future updates

### Create New Keystore (if needed)

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/app/release.keystore \
  -alias becky-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

---

## Build Commands Reference

### Full Release Build Process

```bash
# 1. Install dependencies
yarn install

# 2. Fix any version issues
npx expo install --fix

# 3. Generate Android project
npx expo prebuild --platform android --clean

# 4. Update gradle memory (if needed)
# Edit android/gradle.properties:
# org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m

# 5. Build release APK
cd android && ./gradlew assembleRelease -x lint

# 6. Copy to builds directory
cp app/build/outputs/apk/release/app-release.apk ../builds/becky-crm-v1.1.3-release.apk
```

### Debug Build Process

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
```

### Using Expo CLI

```bash
# Build and run on connected device
npx expo run:android

# Build release with Expo
npx expo run:android --variant release
```

---

## Distribution

### Direct APK Distribution

1. Share the APK file via:
   - Google Drive
   - Email attachment
   - Direct download link

2. Users must enable "Install from Unknown Sources" on their device

### Google Play Store

For Play Store distribution:
1. Create Android App Bundle (AAB) instead:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
2. Upload to Google Play Console
3. AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.1.3 | 2024-12-28 | Initial release build with comprehensive testing guide |

---

## Support

For build or testing issues, check:
1. Expo documentation: https://docs.expo.dev
2. React Native docs: https://reactnative.dev
3. Android developer docs: https://developer.android.com

---

*Generated: December 28, 2024*
