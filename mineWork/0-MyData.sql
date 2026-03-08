
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


# Final Implementation Order

```text
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


-- 1. session:{sessionId}
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
-- 17. rate_limit:{userId}:{endpoint}:{minute}
-- 18. login_attempts:{ip}:{hour}


NOT IMPs [later for future]:
| Key                               | Reason                       |
| --------------------------------- | ---------------------------- |
| `ws_connections`                  | can be computed from sockets |
| `session_cache:{userId}:{chatId}` | premature optimization       |
| `anon_cache:{userId}:{chatId}`    | DB lookup is cheap           |
| `key_cache:{userId}:{chatId}`     | only needed for E2EE         |
| `key_version:{chatId}`            | only needed for E2EE         |


OPTIONAL [Later in future]:
| Key                                       | Reason                     |
| ----------------------------------------- | -------------------------- |
| `user_sessions:{userId}`                  | logout all devices feature |
| `user_presence:{userId}`                  | last seen tracking         |
| `notifications:{userId}`                  | faster notifications       |
| `notification_count:{userId}`             | notification badge         |

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


-- ## **1. SESSION & AUTH**

## **2. REAL-TIME & PRESENCE**

### 2.1 Online Users
```redis
Key: online_users
Type: Set
TTL: None
Members: userId1, userId2, ...

Purpose: Track currently online users

Example:
SADD online_users "uuid-123" "uuid-456"
SREM online_users "uuid-789"
```

### 2.2 User to Socket Mapping
```redis
Key: user_socket:{userId}
Type: String
TTL: None (removed on disconnect)
Value: socketId

Purpose: Find socket connection for a user

Example:
SET user_socket:uuid-123 "socket-abc-xyz"
```

### 2.3 Socket to User Mapping (Reverse)
```redis
Key: socket_user:{socketId}
Type: String
TTL: None
Value: userId

Purpose: Find user from socket connection

Example:
SET socket_user:socket-abc-xyz "uuid-123"
```

### 2.4 Chat Room Members
```redis
Key: room:{chatId}
Type: Set
TTL: None
Members: socketId1, socketId2, ...

Purpose: Track all socket connections in a chat/group room

Example:
SADD room:chat-456 "socket-abc" "socket-xyz"
```

### 2.5 Typing Indicators
```redis
Key: typing:{chatId}:{userId}
Type: String
TTL: 5 seconds
Value: timestamp

Purpose: Show "User is typing..." indicator

Example:
SET typing:chat-456:uuid-123 "1706342400"
EXPIRE typing:chat-456:uuid-123 5
```

## **3. MESSAGE QUEUE & CACHING**

### 3.1 Offline Messages Queue
```redis
Key: offline_messages:{userId}
Type: List
TTL: None (cleared when user comes online)
Value: JSON serialized message objects

Purpose: Store messages for offline users

Example:
LPUSH offline_messages:uuid-123 '{"messageId":"msg-1","senderId":"uuid-456","content":"encrypted..."}'
LRANGE offline_messages:uuid-123 0 -1
LTRIM offline_messages:uuid-123 0 0  // Keep only latest
```

### 3.2 Unread Message Counters
```redis
Key: unread_counts:{userId}:{chatId}
Type: String (counter)
TTL: None
Value: unread message count

Purpose: Track unread messages per chat

Example:
INCR unread_counts:uuid-123:chat-456
SET unread_counts:uuid-123:chat-456 0  // Mark as read
```

### 3.3 Recent Messages Cache
```redis
Key: message_cache:{chatId}:recent
Type: List (LRU - max 50 messages)
TTL: None
Value: JSON serialized message objects

Purpose: Cache recent messages to reduce DB queries

Example:
LPUSH message_cache:chat-456:recent '{"messageId":"msg-1","content":"..."}'
LTRIM message_cache:chat-456:recent 0 49  // Keep only 50
LRANGE message_cache:chat-456:recent 0 19  // Get 20 recent
```

## **4. NOTIFICATIONS**

### 4.1 Pending Notifications
```redis
Key: notifications:{userId}
Type: List
TTL: None
Value: JSON notification objects

Purpose: Store pending notifications for user

Example:
LPUSH notifications:uuid-123 '{"type":"chat_request","from":"uuid-456","timestamp":"..."}'
LRANGE notifications:uuid-123 0 9  // Get 10 latest
```

### 4.2 Unread Notification Counter
```redis
Key: notification_count:{userId}
Type: String (counter)
TTL: None
Value: unread count

Example:
INCR notification_count:uuid-123
SET notification_count:uuid-123 0  // Mark all as read
```

## **5. POLL & VOTING CACHE**

### 5.1 Live Poll Vote Counts
```redis
Key: poll_live:{pollId}
Type: Hash
TTL: 6 hours (21600 seconds)
Fields:
  - totalVotes: number
  - votesInFavor: number
  - votesAgainst: number
  - expiresAt: timestamp

Purpose: Real-time vote counting without DB hits

Example:
HSET poll_live:poll-123 totalVotes 10 votesInFavor 7 votesAgainst 3
HINCRBY poll_live:poll-123 votesInFavor 1
EXPIRE poll_live:poll-123 21600
```

### 5.2 Poll Voter Tracking
```redis
Key: user_voted:{pollId}
Type: Set
TTL: 6 hours (21600 seconds)
Members: userId1, userId2, ...

Purpose: Prevent duplicate voting, track who voted

Example:
SADD user_voted:poll-123 "uuid-456"
SISMEMBER user_voted:poll-123 "uuid-456"  // Check if voted
```

## **6. ANONYMOUS IDENTITY CACHE**

### 6.1 Anonymous String to User Mapping
```redis
Key: anon_map:{randomString}
Type: String
TTL: None (persistent)
Value: userId

Purpose: Quick lookup of who owns an anonymous identity

Example:
SET anon_map:anon_xyz789 "uuid-123"
GET anon_map:anon_xyz789
```

### 6.2 User to Anonymous String Mapping
```redis
Key: user_anon:{userId}:{targetId}
Type: String
TTL: None (persistent)
Value: randomString

Purpose: Find anonymous identity for user-target pair

Example:
SET user_anon:uuid-123:uuid-456 "anon_xyz789"
GET user_anon:uuid-123:uuid-456
```

## **7. RATE LIMITING & SECURITY**

### 7.2 WebSocket Authentication Tokens
```redis
Key: ws_auth:{socketId}
Type: String
TTL: 30 seconds
Value: authToken

Purpose: Temporary auth token for WebSocket handshake

Example:
SET ws_auth:socket-abc-xyz "temp-auth-token-123"
EXPIRE ws_auth:socket-abc-xyz 30
```
