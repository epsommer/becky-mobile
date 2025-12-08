# Android SDK Setup for macOS

## Overview
This guide will help you set up Android Studio and the Android SDK to run the Becky Mobile app in an Android emulator.

**Estimated Time**: 30-45 minutes (including downloads)

---

## Prerequisites

- macOS (you're on this already)
- At least 10GB free disk space
- Stable internet connection for downloads

---

## Step 1: Install Android Studio

### Download and Install

1. **Download Android Studio**:
   - Visit: https://developer.android.com/studio
   - Click "Download Android Studio"
   - Accept the terms and download

2. **Install Android Studio**:
   ```bash
   # Open the downloaded DMG file
   open ~/Downloads/android-studio-*.dmg
   ```
   - Drag Android Studio to Applications folder
   - Launch Android Studio from Applications

3. **Complete Setup Wizard**:
   - Choose "Standard" installation
   - Accept all licenses
   - Wait for SDK components to download (~3-5 GB)

---

## Step 2: Configure Android SDK

### Install Required SDK Components

1. **Open SDK Manager**:
   - Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK
   - Or: Tools → SDK Manager

2. **Install SDK Platforms**:
   - Check: **Android 13.0 (Tirmamisu) API Level 33** ✓
   - Check: **Android 12.0 (S) API Level 31** ✓
   - Click "Apply" and wait for download

3. **Install SDK Tools** (SDK Tools tab):
   - Check: **Android SDK Build-Tools 33.0.0** ✓
   - Check: **Android SDK Command-line Tools (latest)** ✓
   - Check: **Android Emulator** ✓
   - Check: **Android SDK Platform-Tools** ✓
   - Click "Apply" and wait for download

---

## Step 3: Set Environment Variables

### Add to Shell Profile

1. **Determine your shell**:
   ```bash
   echo $SHELL
   ```
   - If `/bin/zsh` → edit `~/.zshrc`
   - If `/bin/bash` → edit `~/.bash_profile`

2. **Add Android environment variables**:

   For **zsh** (most common on modern macOS):
   ```bash
   nano ~/.zshrc
   ```

   For **bash**:
   ```bash
   nano ~/.bash_profile
   ```

3. **Add these lines** (paste at the end):
   ```bash
   # Android SDK
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

4. **Save and exit**:
   - Press `Ctrl + O` (save)
   - Press `Enter` (confirm)
   - Press `Ctrl + X` (exit)

5. **Apply changes**:
   ```bash
   # For zsh
   source ~/.zshrc

   # For bash
   source ~/.bash_profile
   ```

6. **Verify installation**:
   ```bash
   echo $ANDROID_HOME
   # Should output: /Users/epsommer/Library/Android/sdk

   adb --version
   # Should output: Android Debug Bridge version...
   ```

---

## Step 4: Create Virtual Device (Emulator)

### Set Up Android Emulator

1. **Open AVD Manager**:
   - Android Studio → Tools → Device Manager
   - Or click the device icon in the toolbar

2. **Create Virtual Device**:
   - Click "Create Device"
   - Select: **Pixel 5** (good middle-ground device)
   - Click "Next"

3. **Select System Image**:
   - Click "Download" next to **Tiramisu (API Level 33)**
   - Wait for download (~1-2 GB)
   - Select the downloaded image
   - Click "Next"

4. **Configure AVD**:
   - Name: "Pixel_5_API_33"
   - Click "Show Advanced Settings"
   - RAM: 2048 MB (or more if you have RAM to spare)
   - Click "Finish"

---

## Step 5: Test the Setup

### Verify Everything Works

1. **Start the emulator** (from Android Studio Device Manager)
   - Click the ▶️ play button next to your virtual device
   - Wait for emulator to boot (~30 seconds first time)

2. **Verify ADB connection**:
   ```bash
   adb devices
   ```
   - Should show: `emulator-5554	device`

3. **Run the Becky Mobile app**:
   ```bash
   cd ~/projects/apps/becky-mobile
   npm run android
   ```

---

## Troubleshooting

### Issue: "adb: command not found"

**Solution**: Environment variables not loaded
```bash
source ~/.zshrc  # or ~/.bash_profile
```

### Issue: Emulator is slow/laggy

**Solutions**:
1. Enable hardware acceleration:
   - System Preferences → Security & Privacy → Allow "Intel HAXM"
2. Allocate more RAM to emulator (AVD settings)
3. Close other applications to free up resources

### Issue: "INSTALL_FAILED_INSUFFICIENT_STORAGE"

**Solution**: Wipe emulator data
- Device Manager → Click ⋮ menu → Wipe Data

### Issue: Port already in use

**Solution**: Kill existing Metro bundler
```bash
lsof -ti:8081 | xargs kill -9
```

---

## Quick Reference Commands

```bash
# Check Android SDK location
echo $ANDROID_HOME

# List connected devices/emulators
adb devices

# Start Expo with Android
npm run android

# Restart Metro bundler
npm start -- --reset-cache

# Kill all adb processes
adb kill-server && adb start-server
```

---

## Alternative: Use Physical Device Instead

**Much simpler approach**:

1. Install "Expo Go" app from Play Store
2. Run `npm start` on your computer
3. Scan QR code with Expo Go app
4. App loads on your phone instantly

No SDK, no emulator, no configuration needed!

---

## Resources

- [Android Studio Download](https://developer.android.com/studio)
- [Expo Android Setup Guide](https://docs.expo.dev/workflow/android-studio-emulator/)
- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
