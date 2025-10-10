# Firebase Email Delivery Fix Guide

## Issue: Password Reset Emails Not Being Delivered

When Firebase shows that emails are sent but they're not received, it's typically due to Firebase's email delivery limitations or configuration issues.

## Root Causes and Solutions

### 1. Firebase Free Tier Limitations

Firebase's free tier has limitations on email delivery:
- Limited daily quota for email sending
- Emails may be delayed or queued
- Lower delivery priority

**Solution**: Upgrade to a paid Firebase plan for better email delivery reliability.

### 2. Email Provider Blocking

Many email providers (especially corporate ones) block or filter Firebase emails:
- Emails come from `noreply@project-id.firebaseapp.com`
- Often flagged as spam or promotional content

**Solution**: 
- Check spam/junk folders
- Try with Gmail, Outlook, or other consumer email providers
- Add sender to contacts/whitelist

### 3. Domain Verification Issues

If using custom domains without proper verification:
- Emails may be marked as suspicious
- Delivery rates decrease significantly

**Solution**:
- Verify your domain in Firebase Console
- Set up proper DNS records (SPF, DKIM)

### 4. Action URL Misconfiguration

If the action URL is not properly configured:
- Firebase may not send emails at all
- Or emails may be sent with broken links

**Solution**:
1. Go to Firebase Console → Authentication → Templates
2. Click on "Password reset" template
3. Click "Customize action URL"
4. Set it to: `http://localhost:8081/reset-password` (for development)
5. For production: `https://yourdomain.com/reset-password`

## Step-by-Step Fix Process

### Step 1: Verify Firebase Authentication Settings

1. Go to Firebase Console → Authentication → Sign-in method
2. Ensure "Email/Password" is enabled
3. Check "Authorized domains" includes `localhost`

### Step 2: Check Email Templates

1. Go to Firebase Console → Authentication → Templates
2. Click on "Password reset" template
3. Verify the template content
4. Click "Customize action URL" and ensure it's set correctly

### Step 3: Test with Different Email Providers

1. Try with Gmail, Outlook, or Yahoo accounts
2. Check spam/junk folders for all providers
3. Add the sender to your contacts

### Step 4: Check Firebase Project Quotas

1. Go to Firebase Console → Project settings → Usage and billing
2. Check if you've hit any email sending quotas
3. Consider upgrading your plan if needed

## Alternative Implementation: Custom Email Service

If Firebase email delivery continues to be problematic, implement a custom email service:

### Option 1: Cloud Functions with SendGrid

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendCustomPasswordReset = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  try {
    // Generate password reset link
    const actionCodeSettings = {
      url: 'http://localhost:8081/reset-password',
      handleCodeInApp: true,
    };
    
    const resetLink = await admin.auth().generatePasswordResetLink(
      email, 
      actionCodeSettings
    );
    
    // Send email via SendGrid
    const msg = {
      to: email,
      from: 'noreply@yourdomain.com',
      subject: 'Reset your StudyBuddy password',
      html: `
        <p>Hello,</p>
        <p>Follow this link to reset your StudyBuddy password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>If you didn't ask to reset your password, you can ignore this email.</p>
        <p>Thanks,<br>Your StudyBuddy team</p>
      `,
    };
    
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
```

### Option 2: Client-Side with Custom Backend

Replace the Firebase `sendPasswordResetEmail` call with your own API:

```javascript
const sendCustomPasswordResetEmail = async (email) => {
  try {
    const response = await fetch('/api/send-reset-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending custom reset email:', error);
    throw error;
  }
};
```

## Testing Checklist

Before going to production, test all these scenarios:

- [ ] Email received in inbox (Gmail, Outlook, Yahoo)
- [ ] Email received in spam/junk folder
- [ ] Reset link works correctly
- [ ] Password can be successfully changed
- [ ] Error handling works (invalid email, etc.)
- [ ] Rate limiting works (too many requests)
- [ ] Security measures are in place (no email enumeration)

## Production Deployment

When moving to production:

1. Update action URLs to your production domain
2. Set up proper domain verification
3. Configure DNS records for better deliverability
4. Consider upgrading Firebase plan
5. Implement monitoring for email delivery failures
6. Set up alerts for quota limits