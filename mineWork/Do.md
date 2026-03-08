
# ############## ToAdd ####################

## Security & Privacy Enhancements
- **Account Deletion**: Permanent account deletion with data removal
- **Message Pagination**: Load messages in batches for performance
- **Lazy Loading**: Load images and media on demand
- **CDN Integration**: Serve static assets via CDN
- **Redis Caching**: Cache frequently accessed data
- **Database Optimization**: Query optimization and indexing

# ################## SHELVED ########################

## Customization & Personalization
- **Custom Themes**: Create custom color themes
- **Chat Wallpapers**: Set custom backgrounds for chats
- **Chat Colors**: Different colors for different conversations
- **Font Customization**: Change font size and style
- **Custom Emoji Packs**: Add custom emoji sets
- **Sticker Support**: Send and create custom stickers
- **GIF Integration**: Search and send GIFs (Giphy/Tenor)
- **Profile Themes**: Custom profile page themes
- **Nickname System**: Set nicknames for contacts

## College-Specific Features
- **Timetable Integration**: Show class schedules
- **Exam Reminders**: Notifications for upcoming exams
- **Assignment Tracker**: Track and discuss assignments
- **Faculty Chat**: Designated channels for faculty communication
- **Notice Board**: Official college announcements
- **Event Calendar**: College events and activities
- **Resource Library**: Shared notes and study materials

## Platform Moderation
- **Admin Dashboard**: Comprehensive admin control panel
- **User Management**: View, suspend, or ban users
- **Content Moderation Queue**: Review flagged content
- **Report Management**: Handle user reports efficiently
- **IP Banning**: Block specific IP addresses
- **Rate Limiting**: Advanced rate limiting per user/IP
- **Audit Logs**: Complete system audit trail
- **Analytics Dashboard**: Platform-wide usage analytics

## Data Management
- **Message Backup**: Automatic cloud backup of messages
- **Restore from Backup**: Restore messages from backup
- **Data Compression**: Compress old messages to save space
- **Auto-delete Old Data**: Automatically remove old, unused data
- **Storage Analytics**: Show storage usage per user/group
- **Media Cleanup**: Remove unused media files

## Integration & Productivity
- **Task Management**: Create tasks from messages
- **Reminder System**: Set reminders for messages and tasks
- **Polls & Surveys**: Advanced polling system
- **File Collaboration**: Collaborative document editing
- **Shared Whiteboard**: Draw and collaborate in real-time

## File Sharing Enhancements
- **Document Sharing**: Support for PDFs, Word docs, Excel sheets
- **Video Sharing**: Upload and share video files
- **Audio Files**: Share audio files and recordings
- **File Size Limits**: Larger file support with compression
- **File Preview**: In-app preview for documents and media
- **Batch Upload**: Upload multiple files at once
- **Cloud Integration**: Direct integration with Google Drive, OneDrive

## Organization & Management
- **Chat Archiving**: Archive old conversations
- **Chat Pinning**: Pin important conversations to top
- **Favorite Contacts**: Star/favorite frequently contacted users
- **Chat Folders**: Organize chats into custom folders
- **Chat Muting**: Mute notifications for specific chats
- **Chat Labels/Tags**: Tag conversations for organization
- **Quick Filters**: Filter chats by unread, groups, anonymous, etc.

## Message Status & Tracking
- **Group Read Receipts**: See who read messages in groups
- **Batch Read**: Mark all messages as read

## Notifications & Status
- **Push Notifications**: Web and mobile push notifications
- **Notification Settings**: Granular notification controls per conversation/group
- **Online/Offline Status**: Real-time user presence indicators
- **Last Seen**: Display last active timestamps
- **Notification Sounds**: Customizable notification sounds
- **Badge Counts**: Unread message counters on app icon

## Group Communication
- **Group Channels**: Create topic-based channels within groups
- **Sub-groups**: Create smaller groups within main groups
- **Announcement Channels**: Admin-only posting channels 
- **Group Voice Rooms**: Persistent voice rooms within groups ???
- **Group Events**: Create and manage group events/meetups
- **Group Calendar**: Shared calendar for group activities

## Group Administration
- **Role-based Permissions**: Custom roles beyond admin/member (moderator, etc.)
- **Admin Levels**: Different admin permission levels
- **Member Approval**: Require admin approval for join requests
- **Group Rules**: Display group rules and guidelines
- **Auto-moderation**: Automated spam/abuse detection
- **Slow Mode**: Limit message frequency in active groups
- **Member Verification**: Require verification to join specific groups

## Message Management
- **Forward Messages**: Forward messages to other conversations/groups
- **Message Pinning**: Pin important messages in conversations/groups
- **Message Search**: Search messages within conversations and globally
- **Message Mentions**: @mention users in group chats with notifications
- **Message Formatting**: Markdown/rich text support (bold, italic, code blocks)
- **Link Previews**: Automatic preview cards for shared links
- **Scheduled Messages**: Schedule messages to send at specific times

## Security & Privacy Enhancements
- **Self-destructing Messages**: Messages that auto-delete after set time
- **Disappearing Messages**: Auto-delete all messages after X days
- **Screenshot Detection**: Notify when screenshots are taken
- **Two-Factor Authentication**: 2FA for login security
- **App Lock**: PIN/password to open the app
- **Device Management**: View and manage logged-in devices
- **Session Management**: Remote logout from other devices
- **Privacy Settings**: 
  - Who can see profile picture
  - Who can see last seen
  - Who can add to groups
  - Who can send messages
- **Anonymous Mode Toggle**: Easily switch between anonymous and regular mode
- **Data Export**: Download all personal data (GDPR compliance)
- **Load Balancing**: Distribute traffic across multiple servers
- **Horizontal Scaling**: Scale out with additional server instances
- **Microservices**: Break into microservices for scalability
- **GraphQL API**: Alternative to REST for efficient data fetching

## Group Administration
- **Invite Links/Codes**: Generate shareable invite links with expiry

============================================

## Authentication Layer

Used during **login / API auth middleware**.

1. `session:{sessionId}`
2. `rate_limit:{userId}:{endpoint}:{minute}`
3. `login_attempts:{ip}:{hour}`

Integration:

```text
Auth API
 ├─ login
 ├─ middleware verify session
 └─ rate limiter
```

## WebSocket Authentication

Used when **socket connects**.

4. `ws_auth:{socketId}`

Integration:

```text
WebSocket handshake
 ↓
verify session
 ↓
store ws_auth
```

---

## Socket Routing

Required before any real-time events.

5. `user_socket:{userId}`
6. `socket_user:{socketId}`

Integration:

```text
socket connected
 ↓
map user ↔ socket
 ↓
used for direct message delivery
```

---

## Presence System

7. `online_users`

Integration:

```text
socket connect → SADD online_users
socket disconnect → SREM online_users
```

Used by:

* online indicator
* message delivery

---

## Chat Room System

8. `room:{chatId}`

Integration:

```text
user opens chat
 ↓
SADD room:{chatId} socketId
```

Used for:

* group message broadcast
* typing events

---

## Typing Indicators

9. `typing:{chatId}:{userId}`

Integration:

```text
user typing
 ↓
SETEX typing:{chatId}:{userId} 5
 ↓
broadcast typing event
```

---

## Messaging Performance

10. `message_cache:{chatId}:recent`
11. `offline_messages:{userId}`
12. `unread_counts:{userId}:{chatId}`

Integration:

```text
message sent
 ├─ save DB
 ├─ LPUSH message_cache
 ├─ INCR unread_counts
 └─ if offline → offline_messages
```

---

## Notifications

13. `notifications:{userId}`
14. `notification_count:{userId}`

Integration:

```text
poll created / admin action
 ↓
LPUSH notifications
 ↓
INCR notification_count
```

Yes — **TTL 7 days works**. Redis supports TTL on lists.

---

## Poll System

15. `poll_live:{pollId}`
16. `user_voted:{pollId}`

Integration:

```text
vote
 ├─ HINCRBY poll_live
 └─ SADD user_voted
```

DB remains source of truth.

---

## Anonymous Identity System

17. `anon_map:{randomString}`
18. `user_anon:{userId}:{targetId}`

Integration:

```text
user enters anonymous chat
 ↓
generate randomString
 ↓
store both mappings
```

Used when sending anonymous messages.

---

# Final Implementation Order

```text
1  session:{sessionId}
2  rate_limit:{userId}:{endpoint}:{minute}
3  login_attempts:{ip}:{hour}

4  ws_auth:{socketId}

5  user_socket:{userId}
6  socket_user:{socketId}

7  online_users

8  room:{chatId}

9  typing:{chatId}:{userId}

10 message_cache:{chatId}:recent
11 offline_messages:{userId}
12 unread_counts:{userId}:{chatId}

13 notifications:{userId}
14 notification_count:{userId}

15 poll_live:{pollId}
16 user_voted:{pollId}

17 anon_map:{randomString}
18 user_anon:{userId}:{targetId}
```

---

# Small Improvements (Recommended)

## Limit message cache

```text
LPUSH message_cache:{chatId}:recent
LTRIM message_cache:{chatId}:recent 0 49
```

---

## Limit offline queue

```text
LPUSH offline_messages:{userId}
LTRIM offline_messages:{userId} 0 99
```

---

## Notification TTL

Better approach:

```text
LPUSH notifications:{userId}
LTRIM notifications:{userId} 0 49
EXPIRE notifications:{userId} 604800
```

## ################################################################

1. session:{sessionId}
2. ws_auth:{socketId}
3. user_socket:{userId}
4. socket_user:{socketId}
5. online_users
6. room:{chatId}
7. typing:{chatId}:{userId}
8. unread_counts:{userId}:{chatId}
9. message_cache:{chatId}:recent
10. offline_messages:{userId}
11. notifications:{userId}
12. notification_count:{userId}
13. poll_live:{pollId}
14. user_voted:{pollId}
15. anon_map:{randomString}
16. user_anon:{userId}:{targetId}
17. rate_limit:{userId}:{endpoint}:{minute}
18. login_attempts:{ip}:{hour}


Session & Auth (String type)
    Key format: session:{sessionId}
    Value: JSON string with user data
    {
    "userId": "uuid",
    "rollNo": "B23XX",
    "createdAt": "timestamp",
    "expiresAt": "timestamp",
    "device": "web/mobile"
    }
    TTL: 7 days

    Key: rate_limit:{userId}:{endpoint}:{minute}
    Value: Integer counter
    TTL: 60 seconds
    Used: Rate limiting per minute

Real-time & Presence (Sets/Hashes)
    // Key: online_users
    // Type: Set of user IDs
    // Used for: Quick online status check
    // TTL: Persistent (cleaned on disconnect)

    // Key: user_socket:{userId}
    // Type: String (socket.id)
    // Used for: Send message to specific user
    // TTL: Session duration

    // Key: socket_user:{socketId}
    // Type: String (userId)
    // Reverse mapping for disconnect cleanup
    // TTL: Session duration

    // Key: room:{chatId} or room:group:{groupId}
    // Type: Set of socket IDs
    // Used for: Broadcasting to chat room
    // TTL: Session duration

    // Key: typing:{chatId}:{userId}
    // Type: String (timestamp)
    // TTL: 5 seconds
    // Used for: Typing indicators


Message Queue & Caching
    // Key: offline_messages:{userId}
    // Type: List of message JSON
    // Max length: 100 messages
    // Used for: Store messages when user offline

    // Key: unread_counts:{userId}:{chatId}
    // Type: Integer counter
    // Used for: Badge counts

    // Key: message_cache:{chatId}:recent
    // Type: List (LRU capped at 50 messages)
    // Value: JSON of recent messages
    // TTL: 1 hour
    // Used for: Quick load of recent chat


Notifications (Lists/Sorted Sets)
    // Key: notifications:{userId}
    // Type: List of notification JSON
    // Max length: 50
    // Used for: In-app notifications
    // TTL: 7 days -- will this work?

    // Key: notification_count:{userId}
    // Type: Integer
    // TTL: 7 days
    // Used: Unread badge


Poll & Voting Cache
    // Key: poll_live:{pollId}
    // Type: Hash
    // Value: {votesFor: 0, votesAgainst: 0, totalVoters: 0}
    // TTL: 6 hours (poll duration)
    // Used for: Live vote updates

    // Key: user_voted:{pollId}
    // Type: Set of user IDs
    // TTL: 6 hours
    // Used for: Prevent double voting


Anonymous Identity Cache
    // Key: anon_map:{randomString}
    // Type: String (userId)
    // TTL: 30 days
    // Used for: Quick anonymous ID resolution

    // Key: user_anon:{userId}:{targetId}
    // Type: String (randomString)
    // TTL: 30 days
    // Used for: Reverse lookup


Rate Limiting & Security
    // Key: ws_auth:{socketId}
    // Type: String (JSON)
    // TTL: 30 seconds
    // Value: {userId, sessionToken, authenticatedAt}
    // Used: WebSocket authentication

    // Key: login_attempts:{ip}:{hour}
    // Type: Integer counter
    // TTL: 1 hour
    // Used for: Brute force protection


