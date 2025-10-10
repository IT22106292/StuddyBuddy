# Updated Firestore Rules Deployment Guide

## Overview
This guide explains how to deploy the updated Firestore rules that fix the message deletion functionality across all chat components.

## Changes Made
1. Fixed global chat message rules to match the actual data structure
2. Added group chat message rules for proper permissions
3. Added one-on-one chat message rules for proper permissions

## Deployment Steps

### Option 1: Using Firebase CLI (Recommended)
1. Open a terminal in your project directory
2. Run the following command:
```bash
firebase deploy --only firestore:rules
```

### Option 2: Manual Deployment via Firebase Console
1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** > **Rules**
4. Replace the existing rules with the content from `firestore.rules` file
5. Click **Publish**

## Verification
After deploying the rules, test the following scenarios:
1. Delete messages for yourself only in Global Chat
2. Delete your own messages for everyone in Global Chat
3. Delete messages for yourself only in Group Chat
4. Delete your own messages for everyone in Group Chat
5. Delete messages for yourself only in One-on-One Chat
6. Delete your own messages for everyone in One-on-One Chat

## Troubleshooting
If you still experience issues after deploying the rules:

1. Check the browser console for error messages
2. Verify that you're authenticated and have a valid user ID
3. Ensure the Firebase project is correctly configured
4. Check that the rules were deployed successfully by running:
```bash
firebase firestore:rules:get
```

## Rules Explanation

### Global Chat Rules
```
match /globalChat/{messageId} {
  allow read, create: if request.auth != null;
  allow update, delete: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
}
```
- Any authenticated user can read and create messages
- Only the message sender or an admin can update/delete messages

### Group Chat Message Rules
```
match /groupChats/{groupId}/messages/{messageId} {
  allow read, create: if request.auth != null;
  allow update, delete: if request.auth != null && (resource.data.senderId == request.auth.uid || isAdmin());
}
```
- Any authenticated user can read and create messages
- Only the message sender or an admin can update/delete messages

### One-on-One Chat Message Rules
```
match /chats/{chatId}/messages/{messageId} {
  allow read, create: if request.auth != null;
  allow update, delete: if request.auth != null && (resource.data.from == request.auth.uid || isAdmin());
}
```
- Any authenticated user can read and create messages
- Only the message sender or an admin can update/delete messages