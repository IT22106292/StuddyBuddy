# Message Deletion Functionality Documentation

## Overview
This document explains how message deletion works across the different chat components in the StuddyBuddy application. The implementation ensures that users can delete messages either for themselves only or for everyone, with appropriate restrictions.

## Implementation Details

### 1. Global Chat (`app/global-chat.js`)

#### Message Deletion Options:
- **Delete for Me**: Removes the message from the current user's view only
- **Delete for Everyone**: Removes the message for all users (only available for messages sent by the current user)

#### Technical Implementation:
- Messages deleted for everyone are marked with `deletedForEveryone: true` and `text: "This message was deleted"`
- Messages deleted for the current user only are marked with `deletedBy.{userId}: true`
- When fetching messages, messages deleted for the current user are filtered out completely
- Messages deleted for everyone still appear in the chat with the text "This message was deleted"

#### Key Functions:
- `deleteForMe()`: Marks selected messages as deleted for the current user only
- `deleteForEveryone()`: Marks selected messages as deleted for everyone (only works on messages sent by the current user)

### 2. Group Chat (`components/GroupChat.js`)

#### Message Deletion Options:
- **Delete for Me**: Removes the message from the current user's view only
- **Delete for Everyone**: Removes the message for all group members (only available for messages sent by the current user)

#### Technical Implementation:
- Similar to Global Chat but scoped to group-specific collections
- Messages are stored in `groupChats/{groupId}/messages` subcollections
- Same filtering logic applies for displaying messages

#### Key Functions:
- `deleteForMe()`: Marks selected messages as deleted for the current user only
- `deleteForEveryone()`: Marks selected messages as deleted for everyone (only works on messages sent by the current user)

### 3. One-on-One Chat (`app/chat.js`)

#### Message Deletion Options:
- **Delete for Me**: Removes the message from the current user's view only
- **Delete for Everyone**: Removes the message for both users (only available for messages sent by the current user)

#### Technical Implementation:
- Uses a composite key system for message IDs (`roomId:messageId`)
- Messages are stored in `chats/{roomId}/messages` subcollections
- Same filtering logic applies for displaying messages

#### Key Functions:
- `deleteForMe()`: Marks selected messages as deleted for the current user only
- `deleteForEveryone()`: Marks selected messages as deleted for everyone (only works on messages sent by the current user)

## Security Considerations

1. **User Restrictions**: Users can only delete messages for everyone if they are the original sender
2. **Data Integrity**: Deleted messages are not physically removed from the database to maintain chat history integrity
3. **Privacy**: Messages deleted for individual users are only hidden from that specific user's view

## UI/UX Behavior

1. **Selection Mode**: Users enter selection mode by tapping the selection icon, then can select multiple messages
2. **Delete Options**: After selecting messages, users are presented with options to delete for themselves or everyone
3. **Visual Feedback**: 
   - Selected messages are highlighted with a blue border
   - Deleted messages show "This message was deleted" text
   - Appropriate success/error messages are shown after deletion operations

## Edge Cases Handled

1. **Mixed Selection**: When a user selects both their own messages and others' messages, the "Delete for everyone" option will only apply to their own messages
2. **Already Deleted Messages**: Messages that are already deleted for the current user cannot be selected
3. **Network Failures**: Error handling is implemented to show appropriate alerts if deletion operations fail

## Testing

Unit tests are implemented in `__tests__/messageDeletion.test.js` to verify:
- Users can delete their own messages for everyone
- Users can delete any message for themselves only
- Users cannot delete other users' messages for everyone
- Proper UI updates after deletion operations