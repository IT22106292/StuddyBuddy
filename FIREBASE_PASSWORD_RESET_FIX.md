# Firebase Password Reset Fix

## Issue
Firebase password reset emails contain links that point to the default Firebase hosting URL instead of your app's URL, making them non-functional.

## Solution
You need to configure the Firebase Authentication action URL to point to your app.

## Steps to Fix

### 1. Configure Action URL in Firebase Console

1. Go to Firebase Console → Authentication → Templates
2. Click on "Password reset" template
3. Click "Customize action URL"
4. Set the action URL to your app's reset password page:
   ```
   https://your-app-url.com/reset-password
   ```
   Or for local development:
   ```
   http://localhost:8081/reset-password
   ```

### 2. Update Email Templates

In the email template, make sure the URL points to your reset password page:
```
%LINK%
```
Should be replaced with:
```
http://localhost:8081/reset-password?oobCode=%OOB_CODE%&mode=%ACTION_CODE%
```

### 3. Configure Authorized Domains

1. Go to Firebase Console → Authentication → Sign-in method
2. Scroll to "Authorized domains"
3. Add your domain:
   - For local development: `localhost`
   - For production: your app's domain

### 4. Test the Flow

1. Request a password reset from the forgot password page
2. Check your email for the reset link
3. Click the link - it should open your app's reset password page
4. Enter a new password and confirm
5. You should be able to sign in with the new password

## Common Issues and Solutions

### "Invalid action code" Error
- The link may have expired (links typically expire in 1 hour)
- The link may have already been used
- Request a new password reset

### Link Opens in Browser Instead of App
- Configure deep linking in your app
- For Expo, configure the scheme in app.json

### Email Not Received
- Check spam/junk folders
- Verify the email address exists in your Firebase project
- Check Firebase Console for any sending errors

## For Production Deployment

When deploying to production:

1. Update the action URL to your production domain
2. Configure your domain in Firebase Authentication
3. Test the entire flow with a real email address