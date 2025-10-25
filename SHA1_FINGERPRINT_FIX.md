# Fixing Google Sign-In SHA-1 Certificate Fingerprint Issue

## Issue
You're experiencing Google Sign-In errors because the SHA-1 certificate fingerprint is not properly configured in your Google Cloud Console.

## Solution

### Step 1: Add SHA-1 Certificate Fingerprint to Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Find your Android OAuth 2.0 client ID (should be named "Android client 1")
5. Click the pencil icon to edit the client
6. In the "Signing certificate fingerprint" field, add:
   ```
   4B:17:13:AD:16:94:32:B8:F1:CC:E7:AA:76:8C:1B:9E:5B:7D:CE:5C
   ```
7. Click "Save"

### Step 2: Verify Configuration

After adding the SHA-1 fingerprint:

1. Wait 5-10 minutes for the changes to propagate
2. Check that your OAuth 2.0 client shows:
   - Package name: `com.studybuddy.app`
   - SHA-1 certificate fingerprint: `4B:17:13:AD:16:94:32:B8:F1:CC:E7:AA:76:8C:1B:9E:5B:7D:CE:5C`

### Step 3: Update Your Application

We've already updated your configuration files:
- [google-services.json](file:///d:/StuddyBuddy/google-services.json) now contains the correct Android client ID
- [signin.js](file:///d:/StuddyBuddy/app/signin.js) now uses the correct environment variables
- [app.json](file:///d:/StuddyBuddy/app.json) has the correct permissions

### Step 4: Rebuild Your Application

1. Clear the cache:
   ```bash
   cd d:\StuddyBuddy
   npx expo start -c
   ```

2. For a production build:
   ```bash
   cd d:\StuddyBuddy
   npx eas build -p android --profile preview
   ```

### Step 5: Test Google Sign-In

1. Install the new APK on your Android device
2. Open the app and navigate to the sign-in page
3. Tap the "Sign in with Google" button
4. The authentication should now work properly

## Common Issues and Solutions

### Issue: "idp_claimed" Error
If you see an "idp_claimed" error, it means the client ID configuration is incorrect:
1. Double-check that you've added the SHA-1 fingerprint correctly
2. Verify that the package name is exactly `com.studybuddy.app`
3. Make sure you're using the correct Android client ID: `234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com`

### Issue: Configuration Not Taking Effect
If the changes don't seem to take effect:
1. Wait longer (up to 15 minutes) for propagation
2. Try creating a new OAuth 2.0 client ID if the existing one continues to have issues
3. Ensure you're testing with a fresh install of the app

## Additional Notes

- The SHA-1 certificate fingerprint is required for Google Sign-In to work on Android
- This fingerprint ensures that only your app can use the OAuth 2.0 client ID
- For production builds, you'll need to add the release keystore's SHA-1 fingerprint as well

If you continue to experience issues after following these steps, please check the device logs for more detailed error messages.