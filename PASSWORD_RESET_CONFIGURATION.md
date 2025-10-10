# Password Reset Configuration Guide

## Overview
This guide explains how to properly configure Firebase password reset functionality so that reset links work correctly and navigate users to your app.

## Current Issue
Firebase password reset emails contain links that point to Firebase's default hosting URLs instead of your app's URLs, making them non-functional.

## Solution
Configure Firebase Authentication action URLs to point to your app's reset password page.

## Step-by-Step Configuration

### 1. Configure Action URL in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/) → Authentication → Templates
2. Click on "Password reset" template
3. Click "Customize action URL"
4. Set the action URL to your app's reset password page:
   ```
   https://your-production-domain.com/reset-password
   ```
   For local development:
   ```
   http://localhost:8081/reset-password
   ```

### 2. Update Email Template

In the email template, ensure the URL includes the required parameters:
```
http://localhost:8081/reset-password?oobCode=%OOB_CODE%&mode=%ACTION_CODE%&email=%EMAIL%
```

### 3. Configure Authorized Domains

1. Go to Firebase Console → Authentication → Sign-in method
2. Scroll to "Authorized domains"
3. Add your domains:
   - For local development: `localhost`
   - For production: your app's domain

### 4. Test the Flow

1. Request a password reset from the forgot password page
2. Check your email for the reset link
3. Click the link - it should open your app's reset password page
4. Enter a new password and confirm
5. You should be able to sign in with the new password

## File Structure

The implementation consists of these files:
- [app/forgot-password.js](file:///d:/StuddyBuddy/app/forgot-password.js) - Forgot password request page
- [app/reset-password.js](file:///d:/StuddyBuddy/app/reset-password.js) - Password reset page that handles the Firebase action URL
- [app/signin.js](file:///d:/StuddyBuddy/app/signin.js) - Signin page with forgot password link

## How It Works

1. User clicks "Forgot Password" on signin page
2. User enters email address on forgot password page
3. Firebase sends email with reset link containing oobCode parameter
4. User clicks link, which opens reset-password page with parameters
5. User enters new password on reset-password page
6. Firebase updates the password
7. User can sign in with new password

## Common Issues and Solutions

### "Invalid action code" Error
- The link may have expired (links typically expire in 1 hour)
- The link may have already been used
- Request a new password reset

### Link Opens in Browser Instead of App
- Configure deep linking in your app
- For Expo, the scheme is configured in app.json

### Email Not Received
- Check spam/junk folders
- Verify the email address exists in your Firebase project
- Check Firebase Console for any sending errors

## For Production Deployment

When deploying to production:

1. Update the action URL to your production domain
2. Configure your domain in Firebase Authentication
3. Update app.json with production settings
4. Test the entire flow with a real email address

## Security Considerations

- Firebase does not reveal if an email exists in the system for security reasons
- Password reset links are time-limited
- Always use HTTPS in production
- Implement rate limiting to prevent abuse