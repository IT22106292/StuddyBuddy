# Google Sign-In Troubleshooting Guide

## Issue: "Google Sign-In initialization error. Google auth module not available"

This error typically occurs when the `expo-auth-session` module isn't properly loaded or there's an issue with the Google OAuth configuration.

## Solutions

### 1. Reinstall Dependencies

Sometimes dependencies may not be properly installed. Try reinstalling them:

```bash
cd d:\StuddyBuddy
rm -rf node_modules
npm cache clean --force
npm install
```

Or if you're using yarn:
```bash
cd d:\StuddyBuddy
rm -rf node_modules
yarn cache clean
yarn install
```

### 2. Check Expo Auth Session Installation

Verify that `expo-auth-session` is properly installed:

```bash
cd d:\StuddyBuddy
npm list expo-auth-session
```

If it's not installed or there's an error, reinstall it:
```bash
npm install expo-auth-session
```

### 3. Update Expo CLI and Dependencies

Make sure you're using the latest version of Expo CLI:

```bash
npm install -g expo-cli
```

Then update your project dependencies:
```bash
cd d:\StuddyBuddy
npx expo install expo-auth-session
```

### 4. Check Google OAuth Configuration

Verify that your OAuth client IDs are correctly configured:

1. Check [.env](file:///d:/StuddyBuddy/.env) file:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=234882778415-qo2oe5ehans3gpajht9dl4mljqodjq1r.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com
   ```

2. Check [app.json](file:///d:/StuddyBuddy/app.json) file:
   ```json
   "extra": {
     "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "234882778415-qo2oe5ehans3gpajht9dl4mljqodjq1r.apps.googleusercontent.com",
     "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com",
     "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID": "234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com",
     "EXPO_PUBLIC_GOOGLE_REDIRECT_URI": "http://localhost:8081/signin"
   }
   ```

### 5. Verify Google Cloud Console Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Verify that you have OAuth 2.0 Client IDs for:
   - Web application
   - Android application
   - iOS application (if applicable)

5. For each client ID, ensure the redirect URIs are properly configured:
   - Web: Add `http://localhost:8081`
   - Android/iOS: Add `http://localhost:8081/signin`

### 6. Rebuild the Application

After making changes, rebuild your application:

For development:
```bash
cd d:\StuddyBuddy
npx expo start -c
```

For Android build:
```bash
cd d:\StuddyBuddy
npx eas build -p android --profile preview
```

### 7. Test on Physical Device

The Google Sign-In may not work properly in the Expo Go app. Test on a physical device with a standalone build:

1. Build a standalone APK:
   ```bash
   cd d:\StuddyBuddy
   npx eas build -p android --profile preview
   ```

2. Download and install the APK on your Android device
3. Test the Google Sign-In functionality

### 8. Check for Runtime Errors

Add more detailed logging to identify the exact issue:

In [signin.js](file:///d:/StuddyBuddy/app/signin.js), we've added more console.log statements to help debug the issue. Check the device logs when running the app:

1. Connect your Android device to your computer
2. Enable developer options and USB debugging
3. Run:
   ```bash
   adb logcat
   ```
4. Look for error messages related to Google Auth

### 9. Alternative Implementation

If the issue persists, you can try using the `expo-google-sign-in` package instead:

1. Install the package:
   ```bash
   cd d:\StuddyBuddy
   npx expo install expo-google-sign-in
   ```

2. Note that this package is deprecated but might work as a temporary solution

### 10. Check Expo Documentation

Refer to the official Expo documentation for the latest Google authentication setup:
- [Expo Google Authentication Guide](https://docs.expo.dev/guides/authentication/#google)
- [expo-auth-session Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)

## Additional Notes

- The error "Google auth module not available" typically indicates that the `expo-auth-session` package isn't properly loaded at runtime
- This can happen if there are version conflicts or if the package wasn't properly installed
- Testing on a physical device with a standalone build often resolves issues that occur in the Expo Go app

If none of these solutions work, please share the detailed error logs from your device so we can further diagnose the issue.