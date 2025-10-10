# Password Reset Troubleshooting Guide

## Issue: Password Reset Email Not Received

When the app shows "Email Sent" but you don't receive the email, there are several possible causes:

## 1. Check Spam/Junk Folder

The most common reason is that the email is being filtered to your spam or junk folder. Check these folders first.

## 2. Firebase Authentication Configuration Issues

### Email/Password Sign-in Method
1. Go to Firebase Console → Authentication → Sign-in method
2. Ensure "Email/Password" is enabled
3. Check that there are no restrictions on sign-up

### Email Templates
1. Go to Firebase Console → Authentication → Templates
2. Check the "Password reset" template
3. Make sure it's properly configured
4. Verify the "From" address is correct

## 3. Domain Configuration

### Authorized Domains
1. Go to Firebase Console → Authentication → Sign-in method
2. Scroll to "Authorized domains"
3. Ensure `localhost` is listed for development
4. Add your production domain when deploying

### Action URL Configuration
1. Go to Firebase Console → Authentication → Templates
2. Click on "Password reset" template
3. Click "Customize action URL"
4. Set it to: `http://localhost:8081/reset-password`

## 4. Common Error Codes and Solutions

### auth/user-not-found
- Firebase doesn't reveal if a user exists for security reasons
- The app shows success even if the user doesn't exist to prevent email enumeration

### auth/too-many-requests
- You've made too many requests in a short time
- Wait for a while before trying again
- Implement rate limiting in your app

### auth/network-request-failed
- Check your internet connection
- Try again with a stable connection

### auth/internal-error
- Firebase service issue
- Try again later
- Check Firebase status dashboard

## 5. Testing Steps

### Step 1: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Request password reset
4. Look for any error messages

### Step 2: Verify Email Address
- Make sure you're using the exact email address associated with your account
- Check for typos

### Step 3: Try Different Email
- Test with a different email provider (Gmail, Outlook, etc.)
- Some corporate email servers block these emails

### Step 4: Check Firebase Logs
1. Go to Firebase Console → Authentication → Sign-up method
2. Check if there are any restrictions
3. Look at usage quotas

## 6. Development vs Production

### Development Environment
- Action URL: `http://localhost:8081/reset-password`
- Authorized domain: `localhost`

### Production Environment
- Action URL: `https://yourdomain.com/reset-password`
- Authorized domain: `yourdomain.com`

## 7. Alternative Solutions

### Use a Custom Email Service
If Firebase emails continue to have issues, consider implementing a custom email service:

1. Create a Cloud Function to send emails via SendGrid, Mailgun, etc.
2. Call the Cloud Function from your app instead of using Firebase's built-in method
3. Handle the password reset flow manually

### Example Cloud Function:
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendPasswordReset = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  // Generate custom token
  const actionCodeSettings = {
    url: 'http://localhost:8081/reset-password',
    handleCodeInApp: true,
  };
  
  const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
  
  // Send email via SendGrid
  const msg = {
    to: email,
    from: 'noreply@yourdomain.com',
    subject: 'Reset your password',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
  };
  
  await sgMail.send(msg);
  return { success: true };
});
```

## 8. Contact Firebase Support

If none of the above solutions work:
1. Check the Firebase Status Dashboard for any ongoing issues
2. Review Firebase documentation for authentication limits
3. Contact Firebase support with detailed error information